import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import {
  getPublicSupabaseEnvironment,
  isSupabaseConfigured,
} from "./env";

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const environment = getPublicSupabaseEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims verifies the JWT and refreshes stale auth cookies. Do not replace
  // this with getSession, whose cookie-backed user payload is not authoritative.
  await supabase.auth.getClaims();

  return response;
}
