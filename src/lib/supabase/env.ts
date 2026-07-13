import { z } from "zod";

const publicSupabaseEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicSupabaseEnvironment = z.infer<
  typeof publicSupabaseEnvironmentSchema
>;

let cachedEnvironment: PublicSupabaseEnvironment | undefined;

/**
 * Lets public/static surfaces skip auth UI when preview environments have not
 * been wired to Supabase. Values are validated but never returned or logged.
 */
export function isSupabaseConfigured(): boolean {
  return publicSupabaseEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}

export function getPublicSupabaseEnvironment(): PublicSupabaseEnvironment {
  cachedEnvironment ??= publicSupabaseEnvironmentSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return cachedEnvironment;
}
