import { NextResponse, type NextRequest } from "next/server";

import { publicAuthRedirectUrl } from "@/lib/auth/public-redirect";

// Magic-link verification is handled by Better Auth at /api/auth.
export function GET(request: NextRequest) {
  void request;
  return NextResponse.redirect(publicAuthRedirectUrl("/sign-in?error=Please+request+a+new+sign-in+link."));
}
