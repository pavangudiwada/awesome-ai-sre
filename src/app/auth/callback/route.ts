import { NextResponse, type NextRequest } from "next/server";

import { publicAuthRedirectUrl } from "@/lib/auth/public-redirect";

// Supabase callback links are intentionally no longer accepted after the
// Better Auth migration. New OAuth callbacks are served under /api/auth.
export function GET(request: NextRequest) {
  void request;
  return NextResponse.redirect(publicAuthRedirectUrl("/sign-in?error=Please+start+sign-in+again."));
}
