import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  analyticsEventInputSchema,
  analyticsVisitorIdSchema,
  createDailyVisitorHash,
  createOpaqueVisitorId,
  utcDay,
} from "./server";

const VISITOR_ID = "visitor_abcdefghijklmnopqrstuvwxyz_0123456789";
const SECRET = "a-test-secret-that-is-at-least-32-characters";

describe("privacy-safe analytics validation", () => {
  it.each([
    {
      event: "profile_view",
      subjectKind: "product",
      subjectSlug: "holmesgpt",
    },
    {
      event: "profile_view",
      subjectKind: "company",
      subjectSlug: "robusta-dev",
    },
    {
      event: "outbound_click",
      subjectKind: "update",
      subjectSlug: "holmesgpt-1-2",
    },
    {
      event: "update_view",
      subjectKind: "update",
      subjectSlug: "holmesgpt-1-2",
    },
    {
      event: "share",
      subjectKind: "product",
      subjectSlug: "holmesgpt",
    },
  ])("accepts only an allowlisted public event: $event", (event) => {
    expect(analyticsEventInputSchema.parse(event)).toEqual(event);
  });

  it.each([
    {
      event: "save",
      subjectKind: "product",
      subjectSlug: "holmesgpt",
    },
    {
      event: "profile_view",
      subjectKind: "update",
      subjectSlug: "holmesgpt-1-2",
    },
    {
      event: "update_view",
      subjectKind: "company",
      subjectSlug: "robusta-dev",
    },
    {
      event: "share",
      subjectKind: "company",
      subjectSlug: "robusta-dev",
    },
    {
      event: "share",
      subjectKind: "update",
      subjectSlug: "holmesgpt-1-2",
    },
    {
      event: "profile_view",
      subjectKind: "product",
      subjectSlug: "Not A Public Slug",
    },
  ])("rejects a disallowed event or subject pair", (event) => {
    expect(analyticsEventInputSchema.safeParse(event).success).toBe(false);
  });

  it.each([
    "email",
    "userId",
    "query",
    "note",
    "evaluation",
    "properties",
    "destination",
    "channel",
    "url",
    "text",
  ])(
    "rejects the forbidden extra field %s",
    (field) => {
      const result = analyticsEventInputSchema.safeParse({
        event: "profile_view",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
        [field]: "must-never-be-accepted",
      });

      expect(result.success).toBe(false);
    },
  );
});

describe("daily visitor pseudonyms", () => {
  it("is stable within a UTC day and rotates on the next day", () => {
    const first = createDailyVisitorHash(VISITOR_ID, "2026-07-10", SECRET);
    const same = createDailyVisitorHash(VISITOR_ID, "2026-07-10", SECRET);
    const next = createDailyVisitorHash(VISITOR_ID, "2026-07-11", SECRET);

    expect(first).toBe(same);
    expect(first).not.toBe(next);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(VISITOR_ID);
  });

  it("requires a secret of at least 32 characters", () => {
    expect(() =>
      createDailyVisitorHash(VISITOR_ID, "2026-07-10", "too-short"),
    ).toThrow();
  });

  it("creates opaque cookie values and derives days in UTC", () => {
    const first = createOpaqueVisitorId();
    const second = createOpaqueVisitorId();

    expect(analyticsVisitorIdSchema.safeParse(first).success).toBe(true);
    expect(first).not.toBe(second);
    expect(utcDay(new Date("2026-07-10T23:59:59.999-07:00"))).toBe(
      "2026-07-11",
    );
  });
});
