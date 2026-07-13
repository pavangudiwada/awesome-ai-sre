import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import { updateSession } from "./proxy";

describe("Supabase session proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps public previews available when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await updateSession(
      new NextRequest("https://watchlist.test/tools"),
    );

    expect(response.status).toBe(200);
  });
});
