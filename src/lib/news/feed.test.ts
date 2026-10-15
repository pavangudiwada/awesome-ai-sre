import { describe, expect, it } from "vitest";
import reviewedNewsData from "../../../data/reviewed-news.json";
import { canonicalNewsSource, groupPublicNews, mergePublicNews } from "./feed";
import { publishedNewsRowSchema, reviewedNewsCollectionSchema, reviewedNewsSchema, type PublishedNewsRow } from "./schema";

const now = new Date("2026-10-15T12:00:00Z");
const reviewed = reviewedNewsCollectionSchema.parse(reviewedNewsData);
const first = reviewed.find((record) => record.company === "Rootly")!;
const publication: PublishedNewsRow = {
  id: "00000000-0000-4000-8000-000000000001", slug: "new-publication", title: "A reviewed publication",
  summary: "A public summary", source_url: "https://example.com/announcement", content_path: null,
  published_at: "2026-10-14T12:00:00Z",
};

describe("reviewed public news boundary", () => {
  it("contains 26 dated public-source records, funding, and product news", () => {
    expect(reviewed).toHaveLength(26);
    expect(reviewed.some((record) => record.category === "Funding")).toBe(true);
    expect(reviewed.some((record) => record.category === "Product update")).toBe(true);
    expect(reviewed.some((record) => record.company === "Sedai")).toBe(false);
    for (const record of reviewed) expect(record.sources[0].url).toMatch(/^https:\/\//);
  });

  it.each(["http://example.com", "javascript:alert(1)", "https://user:secret@example.com"])("rejects unsafe source %s", (url) => {
    expect(reviewedNewsSchema.safeParse({ ...first, sources: [{ label: "Source", url }] }).success).toBe(false);
  });

  it("rejects invalid calendar dates, unreviewed data, private extras, and duplicate slugs", () => {
    expect(reviewedNewsSchema.safeParse({ ...first, announcedAt: "2026-02-30" }).success).toBe(false);
    expect(reviewedNewsSchema.safeParse({ ...first, reviewed: false }).success).toBe(false);
    expect(reviewedNewsSchema.safeParse({ ...first, practitioner_id: "private" }).success).toBe(false);
    expect(reviewedNewsCollectionSchema.safeParse([first, first]).success).toBe(false);
  });

  it("does not equate funding announcements with close dates", () => {
    for (const record of reviewed.filter((item) => item.category.startsWith("Funding"))) {
      expect(record.eventDate).toBeNull();
    }
    expect(reviewed.find((record) => record.company === "Grafana Labs")?.eventDate).toBe("2026-07-29");
    expect(reviewed.find((record) => record.announcedAt === "2026-08-05")?.eventDate).toBeNull();
  });

  it("uses the Traversal resource listing date and keeps the funding close date unknown", () => {
    const traversal = reviewed.find((record) => record.slug === "traversal-announces-48m-across-seed-and-series-a-funding")!;
    expect(traversal.announcedAt).toBe("2025-06-19");
    expect(traversal.eventDate).toBeNull();
    expect(traversal.sources).toContainEqual(expect.objectContaining({
      label: "Announcement date source", url: "https://www.traversal.com/resources?1f4cc8a4_page=4",
    }));
  });

  it("projects DB rows to public fields and rejects unsafe sources", () => {
    expect(publishedNewsRowSchema.parse({ ...publication, practitioner_id: "private" })).not.toHaveProperty("practitioner_id");
    expect(publishedNewsRowSchema.safeParse({ ...publication, source_url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("global feed merge", () => {
  it("returns the complete file feed without publications or follows", () => {
    expect(mergePublicNews(reviewed, [], new Set(), now)).toHaveLength(26);
  });

  it("hides future announcements, future reviews, and scheduled database rows", () => {
    expect(mergePublicNews([
      { ...first, announcedAt: "2026-10-16", reviewedAt: "2026-10-16" },
      { ...first, slug: "future-review", reviewedAt: "2026-10-16" },
    ], [{ ...publication, published_at: "2026-10-15T13:00:00Z" }], new Set(), now)).toEqual([]);
  });

  it("prefers reviewed dates and categories when slug or canonical source matches", () => {
    const source = new URL(first.sources[0].url);
    source.searchParams.set("utm_source", "newsletter");
    source.hash = "read";
    expect(mergePublicNews([first], [
      { ...publication, slug: first.slug },
      { ...publication, id: "00000000-0000-4000-8000-000000000002", source_url: source.toString() },
    ], new Set(), now)).toHaveLength(1);
    expect(mergePublicNews([first], [publication], new Set(), now).find((item) => item.slug === first.slug)?.category).toBe(first.category);
  });

  it("preserves a matched publication UUID/company on file news without changing announcement chronology", () => {
    const [item] = mergePublicNews([first], [{ ...publication, slug: first.slug, company_slug: "rootly", source_url: first.sources[0].url }], new Set(), now);
    expect(item.publicationId).toBe(publication.id);
    expect(item.companySlug).toBe("rootly");
    expect(item.announcedAt).toBe(first.announcedAt);
    expect(item.id).toBe(`news:${first.slug}`);
  });

  it("preserves a published local article link when merging a reviewed event", () => {
    const [item] = mergePublicNews([first], [{ ...publication, slug: first.slug, content_path: `/updates/${first.slug}` }], new Set([first.slug]), now);
    expect(item.articlePath).toBe(`/updates/${first.slug}`);
    expect(item.announcedAt).toBe(first.announcedAt);
  });

  it("never attaches UUID/read identity from an ineligible matching publication", () => {
    for (const invalidRow of [
      { ...publication, slug: first.slug, source_url: null, content_path: "/updates/removed-draft" },
      { ...publication, slug: first.slug, source_url: first.sources[0].url, content_path: `/updates/${first.slug}` },
      { ...publication, slug: first.slug, source_url: null },
    ]) {
      const [item] = mergePublicNews([first], [invalidRow], new Set(), now);
      expect(item.publicationId).toBeNull();
      expect(item.id).toBe(`news:${first.slug}`);
    }
  });

  it("carries explicit reviewed AWS company identity without relying on display-name equality", () => {
    const aws = reviewed.filter((record) => record.company === "AWS");
    expect(aws).toHaveLength(2);
    expect(mergePublicNews(aws, [], new Set(), now).every((item) => item.companySlug === "aws")).toBe(true);
  });

  it("canonicalizes decoration but keeps meaningful source query parameters", () => {
    expect(canonicalNewsSource("https://www.example.com/news/?utm_source=x&b=2&a=1#top")).toBe("https://example.com/news?a=1&b=2");
    expect(canonicalNewsSource("https://example.com/news?release=2")).not.toBe(canonicalNewsSource("https://example.com/news?release=1"));
  });

  it("preserves distinct dated events from a shared rolling changelog", () => {
    const olly = reviewed.filter((record) => record.company === "Coralogix");
    expect(olly).toHaveLength(2);
    const items = mergePublicNews(olly, [{ ...publication, title: olly[0].title, source_url: olly[0].sources[0].url }], new Set(), now);
    expect(items).toHaveLength(2);
  });

  it("preserves distinct same-day reviewed events from one rolling changelog", () => {
    const aws = reviewed.find((record) => record.title === "AWS DevOps Agent adds investigation quality reviews")!;
    const otherEvent = { ...aws, slug: "aws-adds-four-regions", title: "AWS DevOps Agent adds four Regions" };
    const items = mergePublicNews([aws, otherEvent], [], new Set(), now);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.slug)).toEqual(expect.arrayContaining([aws.slug, otherEvent.slug]));
  });

  it("suppresses a genuine same-day rolling-changelog duplicate with an alternate slug and URL decoration", () => {
    const aws = reviewed.find((record) => record.title === "AWS DevOps Agent adds investigation quality reviews")!;
    const duplicate = {
      ...aws,
      slug: "same-event-mirror",
      title: `${aws.title.toUpperCase()}!`,
      sources: [{ ...aws.sources[0], url: `${aws.sources[0].url}?utm_source=mirror#announcement` }],
    };
    const items = mergePublicNews([aws, duplicate], [], new Set(), now);
    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe(aws.slug);
  });

  it("keeps a distinct DB announcement on a rolling changelog even with one known file event", () => {
    const aws = reviewed.find((record) => record.title === "AWS DevOps Agent adds investigation quality reviews")!;
    expect(mergePublicNews([aws], [{ ...publication, source_url: aws.sources[0].url }], new Set(), now)).toHaveLength(2);
  });

  it("deduplicates standalone database sources even when titles differ", () => {
    expect(mergePublicNews([], [publication, { ...publication, slug: "renamed", title: "New title" }], new Set(), now)).toHaveLength(1);
  });

  it("labels publication dates without inventing announcement or event dates", () => {
    const [item] = mergePublicNews([], [publication], new Set(), now);
    expect(item).toMatchObject({ announcedAt: null, eventDate: null, publishedAt: publication.published_at, timelineDate: "2026-10-14", category: "Watchlist update" });
  });

  it("never links removed/draft MDX, mismatched content paths, or source-less publications", () => {
    const records = [
      { ...publication, content_path: `/updates/${publication.slug}` },
      { ...publication, slug: "unlinked", source_url: null },
      { ...publication, slug: "wrong-path", content_path: "/updates/another" },
    ];
    expect(mergePublicNews([], records, new Set(["wrong-path"]), now)).toEqual([]);
  });

  it("supports a real published local article without an external source", () => {
    const [item] = mergePublicNews([], [{ ...publication, source_url: null, content_path: `/updates/${publication.slug}` }], new Set([publication.slug]), now);
    expect(item.articlePath).toBe(`/updates/${publication.slug}`);
    expect(item.sources).toEqual([]);
  });

  it("groups year and month newest first in UTC with deterministic same-day ordering", () => {
    const items = mergePublicNews(reviewed, [], new Set(), now);
    const groups = groupPublicNews([...items].reverse());
    expect(groups.map((group) => group.year)).toEqual(["2026", "2025", "2023"]);
    expect(groups[0].months[0]).toMatchObject({ key: "2026-10", label: "October" });
    expect(groups[0].months[0].items.map((item) => item.timelineDate)).toEqual(["2026-10-09", "2026-10-08", "2026-10-07", "2026-10-04"]);
    expect(groupPublicNews([])).toEqual([]);
  });
});
