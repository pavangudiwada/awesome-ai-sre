import { describe, expect, it } from "vitest";

import { shouldSendWelcomeEmail } from "./subscription";

describe("newsletter subscription idempotency", () => {
  it("does not welcome an already active subscriber at the same cadence", () => {
    expect(shouldSendWelcomeEmail({ status: "active", frequency: "weekly" }, "weekly")).toBe(false);
  });

  it("welcomes new, reactivated, and changed-cadence subscriptions", () => {
    expect(shouldSendWelcomeEmail(null, "weekly")).toBe(true);
    expect(shouldSendWelcomeEmail({ status: "unsubscribed", frequency: "weekly" }, "weekly")).toBe(true);
    expect(shouldSendWelcomeEmail({ status: "active", frequency: "monthly" }, "weekly")).toBe(true);
  });
});
