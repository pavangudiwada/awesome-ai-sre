import { toNextJsHandler } from "better-auth/next-js";

import { getAuth, isAuthConfigured, isMagicLinkConfigured } from "@/lib/auth/server";
import { consumeMagicLinkBudget, parseMagicLinkEmail } from "@/lib/auth/rate-limit";

function unavailable() {
  return Response.json({ error: "Authentication is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/sign-in/magic-link")) {
    if (!isMagicLinkConfigured()) return unavailable();
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "JSON is required" }, { status: 415, headers: { "Cache-Control": "no-store" } });
    }
    const body = await request.clone().json().catch(() => null);
    const email = parseMagicLinkEmail(body?.email);
    if (!email.success) {
      return Response.json({ error: "A valid email address is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    try {
      const budget = await consumeMagicLinkBudget(email.data, request.headers);
      if (!budget.allowed) {
        return Response.json(
          { error: "Too many sign-in links requested. Please try again later." },
          {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              "Retry-After": String(budget.retryAfterSeconds),
            },
          },
        );
      }
    } catch {
      return unavailable();
    }
  }
  return toNextJsHandler(getAuth()).POST(request);
}
