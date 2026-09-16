import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { trustedClientIp, UNTRUSTED_NETWORK_SOURCE } from "./client-ip";

describe("trusted client IP extraction", () => {
  it("uses only exe's rightmost valid XFF address", () => {
    expect(
      trustedClientIp(
        new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" }),
        "exe",
      ),
    ).toBe("203.0.113.9");
  });
  it("rejects inbound forwarding headers without explicit exe mode", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.9",
      "x-vercel-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "203.0.113.11",
    });
    expect(trustedClientIp(headers)).toBe(UNTRUSTED_NETWORK_SOURCE);
  });
  it("fails closed when the terminal XFF value is forged", () => {
    expect(
      trustedClientIp(
        new Headers({ "x-forwarded-for": "203.0.113.9, forged" }),
        "exe",
      ),
    ).toBe(UNTRUSTED_NETWORK_SOURCE);
  });
});
