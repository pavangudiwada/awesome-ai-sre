import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));

import { getRepositoryStats } from "./repository-stats";

describe("repository statistics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads only the named public repository's actual stars", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ full_name: "pavangudiwada/awesome-ai-sre", stargazers_count: 75 }) }));
    expect(await getRepositoryStats()).toEqual({ stars: 75, checkedAt: expect.any(String) });
    expect(fetch).toHaveBeenCalledWith("https://api.github.com/repos/pavangudiwada/awesome-ai-sre", expect.objectContaining({ cache: "no-store" }));
  });

  it.each([403, 429, 500])("does not turn HTTP %s into a zero-star result", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    expect(await getRepositoryStats()).toBeNull();
  });

  it("rejects a response for another repository", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ full_name: "other/repository", stargazers_count: 100 }) }));
    expect(await getRepositoryStats()).toBeNull();
  });

  it("does not invent data after timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
    expect(await getRepositoryStats()).toBeNull();
  });
});
