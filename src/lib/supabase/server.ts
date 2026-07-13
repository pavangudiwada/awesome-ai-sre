import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { getPublicSupabaseEnvironment } from "./env";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const environment = getPublicSupabaseEnvironment();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. The root proxy refreshes
            // sessions and persists those cookies for the browser instead.
          }
        },
      },
    },
  );
}

export const createServerSupabaseClient = createClient;
