import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import news from "../../../data/reviewed-news.json";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("@/lib/catalog/content", () => ({ getPublishedContentDocuments: () => [] }));

import { getPublicHeaderFeed, getPublicHeaderUpdates } from "./public-updates";

const databaseId = "00000000-0000-4000-8000-000000000001";
const rootly = news.find((record) => record.company === "Rootly")!;
const row = {
  id: databaseId, slug: rootly.slug, company_slug: "rootly", title: rootly.title,
  summary: "A stored publication", source_url: rootly.sources[0].url, content_path: null,
  published_at: "2026-10-14T12:00:00.000Z",
};

beforeEach(() => {
  mocks.sql.mockReset().mockResolvedValue([]);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("public Bell feed", () => {
  it("returns the newest 12 dated global stories without requiring database publications", async () => {
    const updates = await getPublicHeaderUpdates();
    expect(updates).toHaveLength(12);
    expect(updates[0]).toMatchObject({ id: `news:${news[0].slug}`, date: "2026-10-09", date_basis: "announced" });
    expect(updates.some((update) => update.category === "Funding")).toBe(true);
    expect(new Set(updates.map((update) => update.id)).size).toBe(12);
  });

  it("retains a mirrored real UUID/company relation while preserving the reviewed date and category", async () => {
    mocks.sql.mockResolvedValue([row]);
    const updates = await getPublicHeaderUpdates();
    const mirrored = updates.filter((update) => update.slug === rootly.slug);
    expect(mirrored).toHaveLength(1);
    expect(mirrored[0]).toMatchObject({ id: databaseId, company_slug: "rootly", date: rootly.announcedAt, category: rootly.category, href: rootly.sources[0].url });
  });

  it("deduplicates by decorated source even when the mirrored DB slug differs", async () => {
    mocks.sql.mockResolvedValue([{ ...row, slug: "alternate-db-slug", source_url: `${rootly.sources[0].url}?utm_source=alert#top` }]);
    const updates = await getPublicHeaderUpdates();
    expect(updates.filter((update) => update.href === rootly.sources[0].url)).toHaveLength(1);
    expect(updates.find((update) => update.slug === rootly.slug)?.id).toBe(databaseId);
  });

  it("keeps public news on database failure and retries normally on the next request", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("private db detail")).mockResolvedValueOnce([row]);
    const unavailable = await getPublicHeaderFeed();
    expect(unavailable.publicationStatus).toBe("unavailable");
    expect(unavailable.updates).toHaveLength(12);
    expect(unavailable.updates.every((update) => update.id.startsWith("news:"))).toBe(true);
    expect(JSON.stringify(unavailable)).not.toContain("private db detail");
    const recovered = await getPublicHeaderFeed();
    expect(recovered.publicationStatus).toBe("available");
    expect(recovered.updates.some((update) => update.id === databaseId)).toBe(true);
  });

  it("merges eligible manual publications with publication-date labels", async () => {
    mocks.sql.mockResolvedValue([{ ...row, slug: "new-report", source_url: "https://example.com/news", title: "Public report" }]);
    expect((await getPublicHeaderUpdates())[0]).toMatchObject({ id: databaseId, slug: "new-report", date_basis: "published", event_date: null });
  });

  it("rejects invalid DB IDs instead of manufacturing persisted notification identity", async () => {
    mocks.sql.mockResolvedValue([{ ...row, id: `news:${rootly.slug}` }]);
    const feed = await getPublicHeaderFeed();
    expect(feed.publicationStatus).toBe("partial");
    expect(feed.updates.find((update) => update.slug === rootly.slug)?.id).toBe(`news:${rootly.slug}`);
  });
});
