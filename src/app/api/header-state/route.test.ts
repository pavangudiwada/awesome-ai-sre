import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHeaderState: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/presentation/header", () => ({
  getHeaderState: mocks.getHeaderState,
}));

import { GET } from "./route";

describe("header-state API", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns only serializable header data with private no-store caching", async () => {
    mocks.getHeaderState.mockResolvedValue({
      viewer: {
        displayName: "SRE Lead",
        email: "sre@example.com",
        avatarUrl: null,
        workspaceHref: "/workspace/saved",
        settingsHref: "/settings",
        signOutAction: mocks.signOutAction,
      },
      notifications: [],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toContain("Cookie");
    await expect(response.json()).resolves.toEqual({
      viewer: {
        displayName: "SRE Lead",
        email: "sre@example.com",
        avatarUrl: null,
        workspaceHref: "/workspace/saved",
        settingsHref: "/settings",
      },
      notifications: [],
    });
  });

  it("returns a non-cacheable degraded response without leaking errors", async () => {
    mocks.getHeaderState.mockRejectedValue(new Error("private database detail"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({
      error: "Header state is temporarily unavailable",
    });
  });
});
