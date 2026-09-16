import { NextResponse, type NextRequest } from "next/server";

// Magic-link verification is handled by Better Auth at /api/auth.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in?error=Please+request+a+new+sign-in+link.", request.url));
}
