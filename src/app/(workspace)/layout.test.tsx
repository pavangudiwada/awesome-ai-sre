import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ state: vi.fn(), header: vi.fn<(props: Record<string, unknown>) => null>(() => null), markRead: vi.fn() }));
vi.mock("@/actions/workflows", () => ({ markUpdateReadAction: mocks.markRead }));
vi.mock("@/components/watchlist", () => ({ SiteHeader: mocks.header }));
vi.mock("@/lib/presentation/header", () => ({ getHeaderState: mocks.state }));
import WorkspaceLayout from "./layout";

describe("workspace public Bell degradation", () => {
  it("forwards publication and personalization availability without changing private child routing", async () => {
    mocks.state.mockResolvedValue({ viewer: null, notifications: [], publicationStatus: "unavailable", personalizationUnavailable: true });
    render(await WorkspaceLayout({ children: "Workspace child" }));
    expect(mocks.header.mock.calls[0]?.[0]).toMatchObject({ notificationsStatus: "partial", accountUnavailable: true, markNotificationReadAction: mocks.markRead });
  });
});
