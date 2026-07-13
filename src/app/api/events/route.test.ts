import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  createOpaqueVisitorId: vi.fn(() =>
    "generated_abcdefghijklmnopqrstuvwxyz_0123456789",
  ),
  recordAnalyticsEvent: vi.fn(async () => true),
}));

vi.mock("@/lib/analytics/server", () => ({
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
  analyticsVisitorIdSchema: z
    .string()
    .min(32)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  createOpaqueVisitorId: mocks.createOpaqueVisitorId,
  recordAnalyticsEvent: mocks.recordAnalyticsEvent,
}));

import { POST } from "./route";

function request(body: unknown, cookie?: string) {
  return new NextRequest("https://aisre.pavangudiwada.dev/api/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: `aisre_visitor=${cookie}` } : {}),
    },
  });
}

describe("POST /api/events", () => {
  beforeEach(() => {
    mocks.createOpaqueVisitorId.mockClear();
    mocks.recordAnalyticsEvent.mockClear();
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
      "aisre_visitor=generated_",
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
        visitor,
      ),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.anything(),
      visitor,
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
    );
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
