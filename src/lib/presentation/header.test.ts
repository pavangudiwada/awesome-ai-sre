import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  practitioner: vi.fn(), sql: vi.fn(), feed: vi.fn(), companies: vi.fn(() => [{ slug: "acme", name: "Acme" }]), signOut: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("@/lib/auth/actions", () => ({ getAuthenticatedPractitionerId: mocks.practitioner }));
vi.mock("@/lib/catalog", () => ({ getCompanies: mocks.companies }));
vi.mock("./public-updates", () => ({ getPublicHeaderFeed: mocks.feed }));

import { getHeaderState } from "./header";

const uuid = "00000000-0000-4000-8000-000000000001";
const secondUuid = "00000000-0000-4000-8000-000000000002";
const practitionerId = "00000000-0000-4000-8000-000000000003";
const update = {
  id: "news:acme-launch", slug: "acme-launch", company_slug: null, company_name: "Acme", title: "Acme launch", summary: "Public summary",
  href: "https://example.com/launch", date: "2026-10-09", date_basis: "announced", event_date: null, category: "Launch",
};

beforeEach(() => {
  mocks.practitioner.mockReset().mockResolvedValue(null);
  mocks.sql.mockReset().mockResolvedValue([]);
  mocks.feed.mockReset().mockResolvedValue({ updates: [update], publicationStatus: "available" });
});

describe("header presentation state", () => {
  it("keeps dated public file notifications available without a session or private reads", async () => {
    const state = await getHeaderState();
    expect(state.viewer).toBeNull();
    expect(state.notifications[0]).toMatchObject({ id: "news:acme-launch", source: "watchlist", publishedAtLabel: "Announced Oct 9, 2026", actualEventDateLabel: "Unknown", category: "Launch" });
    expect(state.notifications[0]).not.toHaveProperty("unread");
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("preserves genuine read/unread UUIDs and followed-company labels without inventing file read state", async () => {
    mocks.practitioner.mockResolvedValue(practitionerId);
    mocks.feed.mockResolvedValue({ updates: [update, { ...update, id: uuid, company_slug: "acme" }, { ...update, id: secondUuid, slug: "another" }], publicationStatus: "available" });
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join(" ");
      if (query.includes('from auth."user"')) return [{ email: "sre@example.com", name: "SRE", image: null }];
      if (query.includes("from public.practitioner_profiles")) return [{ display_name: "Lead" }];
      if (query.includes("from public.update_reads")) return [{ update_id: uuid }];
      if (query.includes("from public.company_follows")) return [{ company_slug: "acme" }];
      return [];
    });
    const state = await getHeaderState();
    expect(state.viewer).toMatchObject({ displayName: "Lead", email: "sre@example.com" });
    expect(state.notifications[0]).toMatchObject({ source: "followed-company", companyName: "Acme" });
    expect(state.notifications[0]).not.toHaveProperty("unread");
    expect(state.notifications[1]).toMatchObject({ id: uuid, unread: false, source: "followed-company" });
    expect(state.notifications[2]).toMatchObject({ id: secondUuid, unread: true });
    for (const call of mocks.sql.mock.calls) expect(call[1]).toBe(practitionerId);
  });

  it("maps AWS news to the followed Amazon Web Services catalog identity", async () => {
    mocks.practitioner.mockResolvedValue(practitionerId);
    mocks.companies.mockReturnValueOnce([{ slug: "aws", name: "Amazon Web Services" }]);
    mocks.feed.mockResolvedValue({ updates: [{ ...update, company_name: "AWS", company_slug: "aws" }], publicationStatus: "available" });
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => strings.join(" ").includes("from public.company_follows") ? [{ company_slug: "aws" }] : []);
    const state = await getHeaderState();
    expect(state.notifications[0]).toMatchObject({ source: "followed-company", companyName: "Amazon Web Services" });
    expect(state.notifications[0]).not.toHaveProperty("unread");
  });

  it("retains file-only news with an explicit unavailable-publication state", async () => {
    mocks.feed.mockResolvedValue({ updates: [update], publicationStatus: "unavailable" });
    const state = await getHeaderState();
    expect(state.publicationStatus).toBe("unavailable");
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).not.toHaveProperty("unread");
  });

  it("keeps public news if session verification fails without guessing a viewer or read state", async () => {
    mocks.practitioner.mockRejectedValue(new Error("private auth detail"));
    const state = await getHeaderState();
    expect(state).toMatchObject({ viewer: null, personalizationUnavailable: true });
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).not.toHaveProperty("unread");
    expect(JSON.stringify(state)).not.toContain("private auth detail");
  });

  it("does not expose partial private results after an ownership-scoped read fails", async () => {
    mocks.practitioner.mockResolvedValue(practitionerId);
    mocks.sql.mockRejectedValueOnce(new Error("private db failure"));
    const state = await getHeaderState();
    expect(state.viewer).toBeNull();
    expect(state.personalizationUnavailable).toBe(true);
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).not.toHaveProperty("unread");
  });
});
