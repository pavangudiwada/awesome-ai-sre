import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TooltipProvider } from "@/components/ui/tooltip";

const mocks = vi.hoisted(() => ({
  markUpdateReadAction: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/actions/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/actions/workflows", () => ({
  markUpdateReadAction: mocks.markUpdateReadAction,
}));

import { PublicSiteHeader } from "./public-site-header";

function renderHeader() {
  return render(
    <TooltipProvider>
      <PublicSiteHeader />
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

    expect(screen.getByLabelText("Loading account")).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Open updates")).toHaveLength(2);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
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

  it("keeps public navigation usable and labels unavailable updates after failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false)));

    renderHeader();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByLabelText("Open updates")[0]);
    expect(screen.getByText("Updates unavailable")).toBeInTheDocument();
  });
});
