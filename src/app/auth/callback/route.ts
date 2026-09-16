import { NextResponse, type NextRequest } from "next/server";

// Supabase callback links are intentionally no longer accepted after the
// Better Auth migration. New OAuth callbacks are served under /api/auth.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in?error=Please+start+sign-in+again.", request.url));
}
