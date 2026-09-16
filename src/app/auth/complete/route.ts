import { NextResponse, type NextRequest } from "next/server";

import { completeAuthRedirect } from "@/lib/auth/complete-callback";
import { publicAuthRedirectUrl } from "@/lib/auth/public-redirect";
import { internalReturnPathSchema } from "@/lib/auth/schemas";

export async function GET(request: NextRequest) {
  const requested = internalReturnPathSchema.safeParse(request.nextUrl.searchParams.get("next"));
  const returnTo = await completeAuthRedirect(requested.success ? requested.data : "/workspace/saved");
  return NextResponse.redirect(publicAuthRedirectUrl(returnTo));
}
