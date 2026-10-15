import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getRepositoryStats: vi.fn() }));
vi.mock("@/lib/presentation/repository-stats", () => mocks);

import { GET } from "./route";

describe("public repository statistics endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only public stars and freshness metadata with caching", async () => {
    const stats = { stars: 75, checkedAt: "2026-10-15T00:00:00Z" };
    mocks.getRepositoryStats.mockResolvedValue(stats);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stats);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("labels unavailable stats without caching a fake result", async () => {
    mocks.getRepositoryStats.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).not.toHaveProperty("stars");
  });
});
