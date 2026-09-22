import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TooltipProvider } from "@/components/ui/tooltip";

const mocks = vi.hoisted(() => ({
  markUpdateReadAction: vi.fn(),
  push: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/actions/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/actions/workflows", () => ({
  markUpdateReadAction: mocks.markUpdateReadAction,
}));

import { PublicSiteHeader } from "./public-site-header";

function renderHeader() {
  return render(
    <TooltipProvider>
      <PublicSiteHeader searchItems={[{
          type: "tool",
          label: "RunWhen",
          description: "AI-powered incident investigation",
          href: "/tools/runwhen",
        }]}
      />
    </TooltipProvider>,
  );
}

function response(body: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("PublicSiteHeader", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a hydration-safe neutral header without fake unread state", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    renderHeader();

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Open updates")).toHaveLength(2);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("requests public updates for anonymous visitors", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHeader();

    expect(fetchMock).toHaveBeenCalled();
  });

  it("hydrates a verified viewer and unread updates from the private endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      viewer: {
        displayName: "SRE Lead",
        email: "sre@example.com",
        avatarUrl: null,
        workspaceHref: "/workspace/saved",
        settingsHref: "/settings",
      },
      notifications: [{
        id: "00000000-0000-4000-8000-000000000001",
        title: "RunWhen update",
        href: "/updates/runwhen-update",
        publishedAtLabel: "Jul 15, 2026",
        unread: true,
        source: "followed-company",
        companyName: "RunWhen",
      }],
    })));

    renderHeader();

    await waitFor(() => {
      expect(screen.getByLabelText("Open account menu for SRE Lead")).toBeInTheDocument();
    });
    expect(screen.getAllByLabelText("Open updates, 1 unread")).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith("/api/header-state", expect.objectContaining({
      cache: "no-store",
      credentials: "same-origin",
    }));
  });

  it("renders a source-linked latest alert for anonymous visitors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      viewer: null,
      notifications: [{
        id: "00000000-0000-4000-8000-000000000002",
        title: "Acme funding",
        summary: "Acme announced a round.",
        href: "https://example.com/news",
        publishedAtLabel: "Sep 22, 2026",
        source: "watchlist",
      }],
    })));
    renderHeader();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Latest alert: Acme funding" })).toHaveAttribute("href", "https://example.com/news");
    });
  });

  it("keeps public navigation usable and labels unavailable updates after failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false)));

    renderHeader();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByLabelText("Open updates")[0]);
    expect(screen.getByText("Updates unavailable")).toBeInTheDocument();
  });

  it("searches the public directory and opens a selected result", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Search tools and resources" }));
    fireEvent.change(screen.getByPlaceholderText("Search tools, companies, or guides…"), {
      target: { value: "RunWhen" },
    });
    fireEvent.click(screen.getByText("RunWhen"));

    expect(mocks.push).toHaveBeenCalledWith("/tools/runwhen");
  });
});
