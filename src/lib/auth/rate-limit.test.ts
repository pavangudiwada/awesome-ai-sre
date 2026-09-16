import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  consumeMagicLinkBudget,
  createMagicLinkRateLimitHash,
  magicLinkRateLimitWindow,
} from "./rate-limit";

const SECRET = "this-is-a-test-secret-with-at-least-thirty-two-characters";

describe("magic-link rate limiting", () => {
  it("uses stable HMAC keys without retaining email or network values", () => {
    const hash = createMagicLinkRateLimitHash("person@example.com", SECRET);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("person@example.com");
  });

  it("uses a fixed UTC hour and reports the remaining window", () => {
    expect(magicLinkRateLimitWindow(new Date("2026-09-16T08:42:15.000Z"))).toEqual({
      startedAt: new Date("2026-09-16T08:00:00.000Z"),
      retryAfterSeconds: 1065,
    });
  });

  it("rejects a budget denied by the durable transaction before auth is called", async () => {
    const transaction = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ accepted: false }]);
    const sql = {
      begin: vi.fn(async (callback: (client: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };

    const budget = await consumeMagicLinkBudget(
      "person@example.com",
      new Headers(),
      { secret: SECRET, sql: sql as never },
    );

    expect(budget.allowed).toBe(false);
    expect(sql.begin).toHaveBeenCalledOnce();
    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
