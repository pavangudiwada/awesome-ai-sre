import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  consumeNewsletterSignupBudget,
  createNewsletterRateLimitHash,
  newsletterRateLimitWindow,
} from "./rate-limit";

const SECRET = "newsletter-test-secret-with-at-least-thirty-two-characters";

describe("newsletter signup rate limiting", () => {
  it("uses an unlinkable source hash", () => {
    const hash = createNewsletterRateLimitHash("203.0.113.8", SECRET);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.8");
  });

  it("uses a fixed UTC hour", () => {
    expect(
      newsletterRateLimitWindow(new Date("2026-09-16T08:42:15.000Z")),
    ).toEqual({
      startedAt: new Date("2026-09-16T08:00:00.000Z"),
      retryAfterSeconds: 1065,
    });
  });

  it("returns a denied durable budget", async () => {
    const transaction = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const sql = {
      begin: vi.fn(
        async (callback: (client: typeof transaction) => Promise<boolean>) =>
          callback(transaction),
      ),
    };

    const result = await consumeNewsletterSignupBudget(new Headers(), {
      secret: SECRET,
      sql: sql as never,
    });

    expect(result.allowed).toBe(false);
    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
