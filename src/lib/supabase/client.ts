"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getPublicSupabaseEnvironment } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const environment = getPublicSupabaseEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}

export const createBrowserSupabaseClient = createClient;
