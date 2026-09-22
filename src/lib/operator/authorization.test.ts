import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isOperatorEmail } from "./authorization";

describe("operator authorization", () => {
  it("accepts only normalized emails in the server allowlist", () => {
    const environment = { OPERATOR_EMAILS: " owner@example.com,OPS@example.com " };
    expect(isOperatorEmail("ops@example.com", environment)).toBe(true);
    expect(isOperatorEmail("outsider@example.com", environment)).toBe(false);
    expect(isOperatorEmail("owner@example.com", {})).toBe(false);
  });
});
