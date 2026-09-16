import { NextRequest, NextResponse } from "next/server";

import {
  ANALYTICS_RATE_LIMIT_REQUESTS,
  ANALYTICS_VISITOR_COOKIE,
  ANALYTICS_VISITOR_COOKIE_MAX_AGE,
  analyticsEventInputSchema,
  consumeAnalyticsIngestionBudget,
  createAnalyticsVisitorCookie,
  createNetworkBoundVisitorId,
  parseAnalyticsVisitorCookie,
  recordAnalyticsEvent,
  utcDay,
} from "@/lib/analytics/server";
import { trustedClientIp } from "@/lib/http/client-ip";

export const ANALYTICS_EVENT_MAX_BODY_BYTES = 1_024;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const OUTCOME_HEADER = "X-Analytics-Outcome";

type AnalyticsFailureCode =
  | "cross_site_request"
  | "invalid_event"
  | "invalid_json"
  | "limiter_unavailable"
  | "payload_too_large"
  | "rate_limited"
  | "storage_unavailable"
  | "unsupported_media_type";

function failure(
  code: AnalyticsFailureCode,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { accepted: false, code },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        [OUTCOME_HEADER]: code,
        ...headers,
      },
    },
  );
}

function isSameOriginBrowserRequest(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

async function readBoundedBody(request: NextRequest): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > ANALYTICS_EVENT_MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

/** Only the explicit exe proxy mode trusts its rightmost appended XFF value. */
export function analyticsNetworkSource(request: NextRequest): string {
  return trustedClientIp(request.headers);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", 403);
  }

  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    return failure("unsupported_media_type", 415);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    if (Number(declaredLength) > ANALYTICS_EVENT_MAX_BODY_BYTES) {
      return failure("payload_too_large", 413);
    }
  }

  const networkSource = analyticsNetworkSource(request);
  try {
    const budget = await consumeAnalyticsIngestionBudget(networkSource);
    if (!budget.allowed) {
      return failure("rate_limited", 429, {
        "Retry-After": String(budget.retryAfterSeconds),
        "X-RateLimit-Limit": String(budget.limit),
        "X-RateLimit-Remaining": "0",
      });
    }
  } catch {
    return failure("limiter_unavailable", 503, { "Retry-After": "60" });
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return failure("invalid_json", 400);
  }

  if (rawBody === null) {
    return failure("payload_too_large", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return failure("invalid_json", 400);
  }

  const parsedEvent = analyticsEventInputSchema.safeParse(body);
  if (!parsedEvent.success) {
    return failure("invalid_event", 400);
  }

  const existingVisitor = parseAnalyticsVisitorCookie(
    request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value,
  );
  const visitorId =
    existingVisitor ??
    createNetworkBoundVisitorId(networkSource, utcDay(new Date()));

  try {
    await recordAnalyticsEvent(parsedEvent.data, visitorId, networkSource);
  } catch {
    return failure("storage_unavailable", 503, { "Retry-After": "60" });
  }

  const response = NextResponse.json(
    { accepted: true },
    {
      status: 202,
      headers: {
        ...NO_STORE_HEADERS,
        [OUTCOME_HEADER]: "accepted",
        "X-RateLimit-Limit": String(ANALYTICS_RATE_LIMIT_REQUESTS),
      },
    },
  );

  if (!existingVisitor) {
    response.cookies.set(
      ANALYTICS_VISITOR_COOKIE,
      createAnalyticsVisitorCookie(visitorId),
      {
        httpOnly: true,
        maxAge: ANALYTICS_VISITOR_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    );
  }

  return response;
}
