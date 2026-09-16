import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  consumeAnalyticsIngestionBudget: vi.fn(async () => ({
    allowed: true,
    limit: 60,
    retryAfterSeconds: 30,
  })),
  createAnalyticsVisitorCookie: vi.fn(
    (visitorId: string) => `signed.${visitorId}`,
  ),
  createNetworkBoundVisitorId: vi.fn(
    () => "generated_abcdefghijklmnopqrstuvwxyz_0123456789",
  ),
  parseAnalyticsVisitorCookie: vi.fn((cookie: string | undefined) =>
    cookie === "signed-existing"
      ? "existing_abcdefghijklmnopqrstuvwxyz_0123456789"
      : null,
  ),
  recordAnalyticsEvent: vi.fn(
    async (rawEvent: unknown, visitorId: string, networkSource: string) => {
      void rawEvent;
      void visitorId;
      void networkSource;
      return true;
    },
  ),
}));

vi.mock("@/lib/analytics/server", () => ({
  ANALYTICS_RATE_LIMIT_REQUESTS: 60,
  ANALYTICS_VISITOR_COOKIE: "aisre_visitor",
  ANALYTICS_VISITOR_COOKIE_MAX_AGE: 60 * 60 * 24 * 180,
  analyticsEventInputSchema: z.discriminatedUnion("event", [
    z
      .object({
        event: z.literal("profile_view"),
        subjectKind: z.enum(["product", "company"]),
        subjectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
      .strict(),
    z
      .object({
        event: z.literal("outbound_click"),
        subjectKind: z.enum(["product", "company", "update"]),
        subjectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
      .strict(),
    z
      .object({
        event: z.literal("update_view"),
        subjectKind: z.literal("update"),
        subjectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
      .strict(),
    z
      .object({
        event: z.literal("share"),
        subjectKind: z.literal("product"),
        subjectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
      .strict(),
  ]),
  consumeAnalyticsIngestionBudget: mocks.consumeAnalyticsIngestionBudget,
  createAnalyticsVisitorCookie: mocks.createAnalyticsVisitorCookie,
  createNetworkBoundVisitorId: mocks.createNetworkBoundVisitorId,
  parseAnalyticsVisitorCookie: mocks.parseAnalyticsVisitorCookie,
  recordAnalyticsEvent: mocks.recordAnalyticsEvent,
  utcDay: vi.fn(() => "2026-07-17"),
}));

import { POST } from "./route";

function request(
  body: unknown,
  cookie?: string,
  headers: Record<string, string> = {},
) {
  return new NextRequest("https://aisrewatchlist.com/api/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: `aisre_visitor=${cookie}` } : {}),
      ...headers,
    },
  });
}

describe("POST /api/events", () => {
  beforeEach(() => {
    mocks.createNetworkBoundVisitorId.mockClear();
    mocks.createAnalyticsVisitorCookie.mockClear();
    mocks.parseAnalyticsVisitorCookie.mockClear();
    mocks.consumeAnalyticsIngestionBudget.mockClear();
    mocks.consumeAnalyticsIngestionBudget.mockResolvedValue({
      allowed: true,
      limit: 60,
      retryAfterSeconds: 30,
    });
    mocks.recordAnalyticsEvent.mockClear();
    mocks.recordAnalyticsEvent.mockResolvedValue(true);
  });

  it("sets an opaque HttpOnly cookie for a first-party visitor", async () => {
    const response = await POST(
      request({
        event: "profile_view",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain(
      "aisre_visitor=signed.generated_",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledOnce();
  });

  it("reuses a valid visitor cookie without resetting it", async () => {
    const visitor = "existing_abcdefghijklmnopqrstuvwxyz_0123456789";
    const response = await POST(
      request(
        {
          event: "outbound_click",
          subjectKind: "company",
          subjectSlug: "robusta-dev",
        },
        "signed-existing",
      ),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.anything(),
      visitor,
      "untrusted-network",
    );
  });

  it("replaces a forged or legacy unsigned visitor cookie", async () => {
    const response = await POST(
      request(
        {
          event: "profile_view",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
        },
        "attacker_chosen_abcdefghijklmnopqrstuvwxyz",
      ),
    );

    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.anything(),
      "generated_abcdefghijklmnopqrstuvwxyz_0123456789",
      "untrusted-network",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "aisre_visitor=signed.generated_",
    );
  });

  it("accepts the aggregate product-share event without extra properties", async () => {
    const response = await POST(
      request({
        event: "share",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      }),
    );

    expect(response.status).toBe(202);
    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledWith(
      {
        event: "share",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      },
      expect.any(String),
      "untrusted-network",
    );
  });

  it("cannot mint ten cohort actors by ignoring Set-Cookie on one network", async () => {
    const requestCount = 12;
    const responses = await Promise.all(
      Array.from({ length: requestCount }, () =>
        POST(
          request(
            {
              event: "profile_view",
              subjectKind: "product",
              subjectSlug: "holmesgpt",
            },
            undefined,
            { "x-forwarded-for": "198.51.100.7, 203.0.113.8" },
          ),
        ),
      ),
    );

    expect(responses.every((response) => response.status === 202)).toBe(true);
    expect(mocks.createNetworkBoundVisitorId).toHaveBeenCalledTimes(
      requestCount,
    );
    expect(
      new Set(
        mocks.recordAnalyticsEvent.mock.calls.map(([, visitorId]) => visitorId),
      ),
    ).toEqual(new Set(["generated_abcdefghijklmnopqrstuvwxyz_0123456789"]));
    expect(
      new Set(
        mocks.recordAnalyticsEvent.mock.calls.map(
          ([, , networkSource]) => networkSource,
        ),
      ),
    ).toEqual(new Set(["untrusted-network"]));
  });

  it("rejects a share destination or non-product share", async () => {
    const withDestination = await POST(
      request({
        event: "share",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
        destination: "linkedin",
      }),
    );
    const companyShare = await POST(
      request({
        event: "share",
        subjectKind: "company",
        subjectSlug: "robusta-dev",
      }),
    );

    expect(withDestination.status).toBe(400);
    expect(companyShare.status).toBe(400);
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects cross-site browser requests before consuming a budget", async () => {
    const response = await POST(
      request(
        {
          event: "profile_view",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
        },
        undefined,
        {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      ),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      accepted: false,
      code: "cross_site_request",
    });
    expect(mocks.consumeAnalyticsIngestionBudget).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies without parsing or storing them", async () => {
    const response = await POST(
      request(
        {
          event: "profile_view",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
        },
        undefined,
        { "content-length": "2048" },
      ),
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("x-analytics-outcome")).toBe(
      "payload_too_large",
    );
    expect(mocks.consumeAnalyticsIngestionBudget).not.toHaveBeenCalled();
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("stops reading a chunked body that exceeds the bound", async () => {
    const response = await POST(
      request(
        {
          event: "profile_view",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
          padding: "x".repeat(2_000),
        },
        undefined,
        { "content-length": "1" },
      ),
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("x-analytics-outcome")).toBe(
      "payload_too_large",
    );
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects unsupported media types", async () => {
    const response = await POST(
      request(
        {
          event: "profile_view",
          subjectKind: "product",
          subjectSlug: "holmesgpt",
        },
        undefined,
        { "content-type": "text/plain" },
      ),
    );

    expect(response.status).toBe(415);
    expect(mocks.consumeAnalyticsIngestionBudget).not.toHaveBeenCalled();
  });

  it("returns a monitorable 429 with retry metadata", async () => {
    mocks.consumeAnalyticsIngestionBudget.mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      retryAfterSeconds: 17,
    });

    const response = await POST(
      request({
        event: "profile_view",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    expect(response.headers.get("x-ratelimit-limit")).toBe("60");
    expect(response.headers.get("x-analytics-outcome")).toBe("rate_limited");
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("fails closed when the durable limiter is unavailable", async () => {
    mocks.consumeAnalyticsIngestionBudget.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const response = await POST(
      request({
        event: "profile_view",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("x-analytics-outcome")).toBe(
      "limiter_unavailable",
    );
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects arbitrary properties without touching storage", async () => {
    const response = await POST(
      request({
        event: "profile_view",
        subjectKind: "product",
        subjectSlug: "holmesgpt",
        email: "private@example.com",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.recordAnalyticsEvent).not.toHaveBeenCalled();
  });
});
