import { NextRequest, NextResponse } from "next/server";

import {
  ANALYTICS_VISITOR_COOKIE,
  ANALYTICS_VISITOR_COOKIE_MAX_AGE,
  analyticsEventInputSchema,
  analyticsVisitorIdSchema,
  createOpaqueVisitorId,
  recordAnalyticsEvent,
} from "@/lib/analytics/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsedEvent = analyticsEventInputSchema.safeParse(body);
  if (!parsedEvent.success) {
    return NextResponse.json(
      { error: "Invalid analytics event" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const existingVisitor = analyticsVisitorIdSchema.safeParse(
    request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value,
  );
  const visitorId = existingVisitor.success
    ? existingVisitor.data
    : createOpaqueVisitorId();

  try {
    await recordAnalyticsEvent(parsedEvent.data, visitorId);
  } catch {
    return NextResponse.json(
      { error: "Analytics unavailable" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.json(
    { accepted: true },
    { status: 202, headers: NO_STORE_HEADERS },
  );

  if (!existingVisitor.success) {
    response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      maxAge: ANALYTICS_VISITOR_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
