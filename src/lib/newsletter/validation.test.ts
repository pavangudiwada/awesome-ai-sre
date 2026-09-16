import { describe, expect, it } from "vitest";

import {
  newsletterSignupSchema,
  newsletterSubscriptionSchema,
  newsletterUnsubscribeTokenSchema,
} from "./validation";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./tokens";

describe("newsletter validation", () => {
  it("accepts a public email signup without account or cadence fields", () => {
    expect(
      newsletterSignupSchema.parse({ email: "  SRE@Example.com " }),
    ).toEqual({ email: "sre@example.com" });
  });

  it("normalizes a consented subscriber without involving authentication", () => {
    expect(
      newsletterSubscriptionSchema.parse({
        email: "  SRE@Example.com ",
        frequency: "weekly",
        consent: "on",
      }),
    ).toMatchObject({ email: "sre@example.com", frequency: "weekly" });
  });

  it("requires explicit consent and a supported frequency", () => {
    expect(() =>
      newsletterSubscriptionSchema.parse({
        email: "sre@example.com",
        frequency: "daily",
        consent: "on",
      }),
    ).toThrow();
    expect(() =>
      newsletterSubscriptionSchema.parse({
        email: "sre@example.com",
        frequency: "weekly",
      }),
    ).toThrow();
  });

  it("creates signed unsubscribe tokens that cannot be altered", () => {
    const subscriptionId = "753cd70c-5619-4c25-81e0-437a21bf3331";
    const secret = "newsletter-unsubscribe-secret-at-least-32-chars";
    const token = createUnsubscribeToken(subscriptionId, secret);
    expect(newsletterUnsubscribeTokenSchema.parse(token)).toBe(token);
    expect(verifyUnsubscribeToken(token, secret)).toBe(subscriptionId);
    expect(verifyUnsubscribeToken(`${token}x`, secret)).toBeNull();
  });
});
