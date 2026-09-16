import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  analyticsRateLimitWindow,
  analyticsEventInputSchema,
  analyticsVisitorIdSchema,
  consumeAnalyticsIngestionBudget,
  createAnalyticsRateLimitHash,
  createAnalyticsVisitorCookie,
  createDailyNetworkHash,
  createDailyVisitorHash,
  createNetworkBoundVisitorId,
  createOpaqueVisitorId,
  parseAnalyticsVisitorCookie,
  recordAnalyticsEvent,
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

  it("accepts only server-signed visitor cookies", () => {
    const cookie = createAnalyticsVisitorCookie(VISITOR_ID, SECRET);

    expect(parseAnalyticsVisitorCookie(cookie, SECRET)).toBe(VISITOR_ID);
    expect(
      parseAnalyticsVisitorCookie(`${cookie.slice(0, -1)}x`, SECRET),
    ).toBeNull();
    expect(parseAnalyticsVisitorCookie(VISITOR_ID, SECRET)).toBeNull();
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

  it("collapses repeated cookieless issuance for one network and UTC day", () => {
    const requests = Array.from({ length: 12 }, () =>
      createNetworkBoundVisitorId(
        "203.0.113.8",
        "2026-07-17",
        SECRET,
      ),
    );

    expect(new Set(requests).size).toBe(1);
    expect(requests[0]).not.toContain("203.0.113.8");
    expect(
      createNetworkBoundVisitorId(
        "203.0.113.8",
        "2026-07-18",
        SECRET,
      ),
    ).not.toBe(requests[0]);
  });

  it("creates a daily-only network cohort pseudonym", () => {
    const first = createDailyNetworkHash(
      "203.0.113.8",
      "2026-07-17",
      SECRET,
    );

    expect(first).toBe(
      createDailyNetworkHash("203.0.113.8", "2026-07-17", SECRET),
    );
    expect(first).not.toBe(
      createDailyNetworkHash("203.0.113.8", "2026-07-18", SECRET),
    );
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("durable analytics ingestion budget", () => {
  it("creates unlinkable hashes for separate fixed windows", () => {
    const firstWindow = new Date("2026-07-17T10:30:00.000Z");
    const nextWindow = new Date("2026-07-17T10:31:00.000Z");
    const first = createAnalyticsRateLimitHash(
      "203.0.113.8",
      firstWindow,
      SECRET,
    );

    expect(
      createAnalyticsRateLimitHash("203.0.113.8", firstWindow, SECRET),
    ).toBe(first);
    expect(
      createAnalyticsRateLimitHash("203.0.113.8", nextWindow, SECRET),
    ).not.toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("aligns the limiter window and calculates Retry-After", () => {
    expect(
      analyticsRateLimitWindow(new Date("2026-07-17T10:30:42.250Z")),
    ).toEqual({
      startedAt: new Date("2026-07-17T10:30:00.000Z"),
      retryAfterSeconds: 18,
    });
  });

  it("uses the shared database counter and fails closed at its limit", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([{ request_count: 1 }])
      .mockResolvedValueOnce([]);
    const database = { execute } as never;
    const options = {
      database,
      now: new Date("2026-07-17T10:30:42.250Z"),
      secret: SECRET,
    };

    await expect(
      consumeAnalyticsIngestionBudget("203.0.113.8", options),
    ).resolves.toMatchObject({ allowed: true, limit: 60 });
    await expect(
      consumeAnalyticsIngestionBudget("203.0.113.8", options),
    ).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 18 });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

describe("event storage deduplication", () => {
  it("uses the daily action conflict key and stores no request metadata", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));
    const limit = vi.fn().mockResolvedValue([{ slug: "holmesgpt" }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const database = { insert, select } as never;

    await expect(
      recordAnalyticsEvent(
        {
          event: "share",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
        },
        VISITOR_ID,
        "203.0.113.8",
        {
          database,
          now: new Date("2026-07-17T10:30:42.250Z"),
          secret: SECRET,
        },
      ),
    ).resolves.toBe(true);

    expect(values).toHaveBeenCalledWith({
      occurredOn: "2026-07-17",
      occurredAt: new Date("2026-07-17T10:30:42.250Z"),
      visitorDayHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      networkDayHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      eventType: "share",
      subjectKind: "product",
      subjectSlug: "holmesgpt",
    });
    expect(onConflictDoNothing).toHaveBeenCalledOnce();
  });
});
