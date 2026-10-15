import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), documents: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("@/lib/catalog/content", () => ({ getPublishedContentDocuments: mocks.documents }));
import { getPublicNewsFeed } from "./public-feed";

const now = new Date("2026-10-15T12:00:00Z");
const publication = {
  id: "00000000-0000-4000-8000-000000000001", slug: "a-new-publication", title: "A new public report", summary: "Public news",
  source_url: "https://example.com/report", content_path: null, published_at: "2026-10-15T10:00:00Z",
};

beforeEach(() => {
  mocks.sql.mockReset();
  mocks.documents.mockReset().mockReturnValue([]);
});

describe("public news publication loading", () => {
  it("keeps all file news when the database has no eligible publications", async () => {
    mocks.sql.mockResolvedValue([]);
    const feed = await getPublicNewsFeed(now);
    expect(feed.publicationStatus).toBe("available");
    expect(feed.items).toHaveLength(26);
  });

  it("distinguishes outage from empty, retains news, and recovers on a new request", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("private connection detail")).mockResolvedValueOnce([publication]);
    const unavailable = await getPublicNewsFeed(now);
    expect(unavailable.publicationStatus).toBe("unavailable");
    expect(unavailable.items).toHaveLength(26);
    expect(JSON.stringify(unavailable)).not.toContain("private connection detail");
    const recovered = await getPublicNewsFeed(now);
    expect(recovered.publicationStatus).toBe("available");
    expect(recovered.items).toHaveLength(27);
  });

  it("reads only public publications with retirement and scheduling filters", async () => {
    mocks.sql.mockResolvedValue([]);
    await getPublicNewsFeed(now);
    const sql = mocks.sql.mock.calls[0][0].join(" ");
    expect(sql).toContain("from public.published_updates");
    expect(sql).toContain("published_at <= now() and retired_at is null");
    expect(sql).not.toMatch(/company_follows|practitioner|auth\.|update_reads/);
  });

  it("rejects invalid external rows without removing the valid public feed", async () => {
    mocks.sql.mockResolvedValue([publication, { ...publication, slug: "invalid", source_url: "javascript:alert(1)" }]);
    const feed = await getPublicNewsFeed(now);
    expect(feed.publicationStatus).toBe("partial");
    expect(feed.items).toHaveLength(27);
    expect(JSON.stringify(feed)).not.toContain("javascript:");
  });

  it("does not forward unexpected private data", async () => {
    mocks.sql.mockResolvedValue([{ ...publication, private_note: "do not reveal", practitioner_id: "sensitive" }]);
    const feed = await getPublicNewsFeed(now);
    expect(JSON.stringify(feed)).not.toContain("do not reveal");
    expect(JSON.stringify(feed)).not.toContain("practitioner_id");
  });

  it("uses the real published-article set for internal links", async () => {
    mocks.documents.mockReturnValue([{ metadata: { slug: publication.slug } }]);
    mocks.sql.mockResolvedValue([{ ...publication, source_url: null, content_path: `/updates/${publication.slug}` }]);
    expect((await getPublicNewsFeed(now)).items[0].articlePath).toBe(`/updates/${publication.slug}`);
  });
});
