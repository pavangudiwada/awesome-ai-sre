import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicProjectLinks } from "./public-project-links";

describe("PublicProjectLinks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps both public destinations visible before stars arrive", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<PublicProjectLinks />);
    expect(screen.getByRole("link", { name: "Open-source project on GitHub" })).toHaveAttribute("href", "https://github.com/pavangudiwada/awesome-ai-sre");
    expect(screen.getByText("Open source")).toBeVisible();
    expect(screen.getByRole("link", { name: "Follow AI SRE Watchlist on LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/company/112729107/");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("displays exact API stars with their check time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stars: 1234, checkedAt: "2026-10-15T00:00:00Z" }) }));
    render(<PublicProjectLinks />);
    const link = await screen.findByRole("link", { name: "Open-source project on GitHub, 1,234 stars" });
    expect(link).toHaveAttribute("title", expect.stringContaining("Oct 15, 2026"));
    expect(fetch).toHaveBeenCalledWith("/api/repository-stats", expect.objectContaining({ credentials: "omit" }));
  });

  it("retains a useful link without a fabricated number on rate limiting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<PublicProjectLinks />);
    await screen.findByText("View stars");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open-source project on GitHub" })).toBeInTheDocument();
  });

  it("rejects malformed or negative counts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stars: -1, checkedAt: "yesterday" }) }));
    render(<PublicProjectLinks />);
    await screen.findByText("View stars");
    expect(screen.queryByText("-1")).not.toBeInTheDocument();
  });

  it("aborts its request on unmount", async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<PublicProjectLinks />);
    view.unmount();
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(1));
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(true);
  });
});
