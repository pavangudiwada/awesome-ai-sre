import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  consumeMagicLinkBudget: vi.fn(),
  authConfigured: true,
  magicLinkConfigured: true,
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: vi.fn(), POST: mocks.post }),
}));
vi.mock("@/lib/auth/server", () => ({
  getAuth: vi.fn(),
  isAuthConfigured: () => mocks.authConfigured,
  isMagicLinkConfigured: () => mocks.magicLinkConfigured,
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  consumeMagicLinkBudget: mocks.consumeMagicLinkBudget,
  parseMagicLinkEmail: (value: unknown) =>
    typeof value === "string" && value.includes("@")
      ? { success: true, data: value }
      : { success: false },
}));

import { POST } from "./route";

describe("POST /api/auth/sign-in/magic-link", () => {
  beforeEach(() => {
    mocks.authConfigured = true;
    mocks.magicLinkConfigured = true;
    mocks.post.mockReset();
    mocks.consumeMagicLinkBudget.mockReset();
  });

  it("returns unavailable before Better Auth can create a token when email delivery is disabled", async () => {
    mocks.magicLinkConfigured = false;

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "person@example.com" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Authentication is temporarily unavailable" });
    expect(mocks.consumeMagicLinkBudget).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("returns a retryable rate limit before Better Auth can create a token", async () => {
    mocks.consumeMagicLinkBudget.mockResolvedValue({ allowed: false, retryAfterSeconds: 123 });

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "person@example.com" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("123");
    expect(await response.json()).toEqual({ error: "Too many sign-in links requested. Please try again later." });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects form-encoded input before Better Auth can create a verification", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/sign-in/magic-link/", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "email=person%40example.com",
      }),
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: "JSON is required" });
    expect(mocks.consumeMagicLinkBudget).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
