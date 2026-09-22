import { describe, expect, it } from "vitest";

import { releaseEnvironmentIssues } from "./verify-release-environment";

const valid = {
  DATABASE_URL: "postgresql://ai_sre:private@127.0.0.1:5432/ai_sre",
  BETTER_AUTH_SECRET: "a".repeat(32),
  AUTH_INTENT_SECRET: "b".repeat(32),
  ANALYTICS_HASH_SECRET: "c".repeat(32),
  SUBMISSION_HASH_SECRET: "d".repeat(32),
  NEWSLETTER_RATE_LIMIT_SECRET: "e".repeat(32),
  BETTER_AUTH_URL: "https://aisrewatchlist.com",
  NEXT_PUBLIC_SITE_URL: "https://aisrewatchlist.com",
  TRUST_PROXY: "exe",
  GOOGLE_CLIENT_ID: "client",
  GOOGLE_CLIENT_SECRET: "secret",
};
describe("release environment", () => {
  it("accepts a local server-only Postgres database and disabled Resend", () =>
    expect(releaseEnvironmentIssues(valid)).toEqual([]));
  it("rejects forged proxy mode, noncanonical host, placeholders, and partial Resend", () => {
    expect(
      releaseEnvironmentIssues({
        ...valid,
        TRUST_PROXY: "",
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "ci-not-a-secret",
        RESEND_API_KEY: "key",
      }).join("\n"),
    ).toMatch(/TRUST_PROXY|BETTER_AUTH_URL|BETTER_AUTH_SECRET|RESEND/);
  });
  it("requires the unsubscribe secret when Resend is enabled", () => {
    expect(
      releaseEnvironmentIssues({
        ...valid,
        RESEND_API_KEY: "key",
        RESEND_SENDER_EMAIL: "newsletter@example.com",
      }).join("\n"),
    ).toMatch(/NEWSLETTER_UNSUBSCRIBE_SECRET/);
  });
  it("accepts Resend as the configured production sign-in method", () =>
    expect(releaseEnvironmentIssues({
      ...valid,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      RESEND_API_KEY: "key",
      RESEND_SENDER_EMAIL: "auth@example.com",
      NEWSLETTER_UNSUBSCRIBE_SECRET: "f".repeat(32),
    })).toEqual([]));
});
