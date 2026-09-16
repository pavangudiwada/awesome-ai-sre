import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashSubmissionIdentity,
  verifyEditorialTurnstile,
} from "./submission-security";

const SECRET = "submission-test-secret-at-least-32-characters";

describe("editorial submission security", () => {
  it("creates stable pseudonyms without retaining the source identifier", () => {
    const hash = hashSubmissionIdentity("203.0.113.10", SECRET);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.10");
  });

  it("accepts only successful Turnstile tokens for the editorial action", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, action: "editorial_submission" }), {
        status: 200,
      }),
    );
    await expect(
      verifyEditorialTurnstile({
        token: "verified-token",
        ipAddress: "203.0.113.10",
        secret: "turnstile-secret",
        fetchImpl,
      }),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });

  it("fails closed on a mismatched action or verification outage", async () => {
    await expect(
      verifyEditorialTurnstile({
        token: "wrong-action",
        ipAddress: "203.0.113.10",
        secret: "turnstile-secret",
        fetchImpl: vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: true, action: "login" }), {
            status: 200,
          }),
        ),
      }),
    ).resolves.toBe(false);
    await expect(
      verifyEditorialTurnstile({
        token: "outage",
        ipAddress: "203.0.113.10",
        secret: "turnstile-secret",
        fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBe(false);
  });
});
