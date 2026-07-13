import { afterEach, describe, expect, it, vi } from "vitest";

import { isSupabaseConfigured } from "./env";

describe("Supabase public environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports an unwired preview without exposing or throwing on values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("rejects a malformed project URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("recognizes a complete public configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    expect(isSupabaseConfigured()).toBe(true);
  });
});
