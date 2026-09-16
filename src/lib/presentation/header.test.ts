import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  practitioner: vi.fn(), sql: vi.fn(), updates: vi.fn(), companies: vi.fn(() => [{ slug: "acme", name: "Acme" }]), signOut: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("@/lib/auth/actions", () => ({ getAuthenticatedPractitionerId: mocks.practitioner }));
vi.mock("@/lib/auth/server", () => ({ isAuthConfigured: () => true }));
vi.mock("@/lib/catalog", () => ({ getCompanies: mocks.companies }));
vi.mock("./public-updates", () => ({ getPublicHeaderUpdates: mocks.updates }));

import { getHeaderState } from "./header";

describe("header presentation state", () => {
  it("keeps public notifications available without a session", async () => {
    mocks.practitioner.mockResolvedValueOnce(null);
    mocks.updates.mockResolvedValueOnce([{ id: "00000000-0000-4000-8000-000000000001", slug: "update", company_slug: "acme", title: "Update", summary: "Summary", published_at: "2026-07-15T12:00:00.000Z" }]);
    const state = await getHeaderState();
    expect(state.viewer).toBeNull();
    expect(state.notifications[0]).toMatchObject({ source: "watchlist" });
  });
});
