import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), unstableCache: vi.fn((loader: () => unknown) => loader) }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));

import { getPublicHeaderUpdates } from "./public-updates";

describe("public header updates", () => {
  it("uses the tagged five-minute public cache", () => {
    expect(mocks.unstableCache).toHaveBeenCalledWith(expect.any(Function), ["public-header-updates-v1"], { revalidate: 300, tags: ["published-updates"] });
  });

  it("accepts canonical ISO timestamps returned by the Postgres query", async () => {
    mocks.sql.mockResolvedValueOnce([{
      id: "00000000-0000-4000-8000-000000000001", slug: "reliable-update", company_slug: null,
      title: "Reliable update", summary: "A reviewed change", published_at: "2026-07-15T12:00:00.000Z",
    }]);
    await expect(getPublicHeaderUpdates()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ slug: "reliable-update" })]));
  });
});
