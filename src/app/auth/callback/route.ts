import { NextResponse, type NextRequest } from "next/server";

import { completeAuthRedirect } from "@/lib/auth/complete-callback";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/workspace/saved";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent("Missing OAuth code.")}`, request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent("Provider sign-in could not be completed.")}`, request.url),
    );
  }

  const returnTo = await completeAuthRedirect(next);
  return NextResponse.redirect(new URL(returnTo, request.url));
}
