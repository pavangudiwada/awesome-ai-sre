import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PENDING_AUTH_INTENT_TTL_SECONDS,
  createPendingAuthIntent,
  verifyPendingAuthIntent,
} from "./pending-intent";

const originalSecret = process.env.AUTH_INTENT_SECRET;

describe("pending auth intents", () => {
  beforeEach(() => {
    process.env.AUTH_INTENT_SECRET = "test-secret-that-is-at-least-32-characters-long";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_INTENT_SECRET;
    } else {
      process.env.AUTH_INTENT_SECRET = originalSecret;
    }
  });

  it.each([
    ["save", "runwhen"],
    ["follow", "better-stack"],
  ] as const)("round-trips a signed %s intent", (action, slug) => {
    const issuedAt = new Date("2026-07-10T07:00:00.000Z");
    const token = createPendingAuthIntent(
      { action, slug, returnTo: `/tools/${slug}` },
      issuedAt,
    );

    expect(
      verifyPendingAuthIntent(token, new Date("2026-07-10T07:09:59.000Z")),
    ).toMatchObject({
      action,
      expiresAt:
        Math.floor(issuedAt.getTime() / 1_000) +
        PENDING_AUTH_INTENT_TTL_SECONDS,
      returnTo: `/tools/${slug}`,
      slug,
      version: 1,
    });
  });

  it("rejects an expired intent", () => {
    const issuedAt = new Date("2026-07-10T07:00:00.000Z");
    const token = createPendingAuthIntent(
      { action: "save", slug: "runwhen", returnTo: "/tools/runwhen" },
      issuedAt,
    );

    expect(
      verifyPendingAuthIntent(token, new Date("2026-07-10T07:10:00.000Z")),
    ).toBeNull();
  });

  it("rejects a payload whose signature was changed", () => {
    const token = createPendingAuthIntent({
      action: "follow",
      slug: "better-stack",
      returnTo: "/companies/better-stack",
    });
    const [payload, signature] = token.split(".");
    const tamperedSignature = `${signature.slice(0, -1)}${
      signature.endsWith("A") ? "B" : "A"
    }`;

    expect(
      verifyPendingAuthIntent(`${payload}.${tamperedSignature}`),
    ).toBeNull();
  });
});
