import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { completeAuthRedirect } from "@/lib/auth/complete-callback";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next") ?? "/workspace/saved";
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing magic-link token") };

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent("The sign-in link is invalid or expired.")}`, request.url),
    );
  }

  const returnTo = await completeAuthRedirect(next);
  return NextResponse.redirect(new URL(returnTo, request.url));
}
