import type { PublishedNewsRow, ReviewedNews } from "./schema";

export type NewsFeedItem = {
  id: string;
  publicationId: string | null;
  companySlug: string | null;
  slug: string;
  title: string;
  summary: string;
  company: string | null;
  product: string | null;
  category: ReviewedNews["category"] | "Watchlist update";
  announcedAt: string | null;
  eventDate: string | null;
  publishedAt: string | null;
  dateNote: string;
  availability: string | null;
  sources: { label: string; url: string }[];
  articlePath: string | null;
  timelineDate: string;
};

/** Ignore tracking decoration while preserving meaningful query parameters. */
export function canonicalNewsSource(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

function normalizedTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** No session or follow state participates in the global public feed. */
export function mergePublicNews(
  reviewed: readonly ReviewedNews[],
  published: readonly PublishedNewsRow[],
  publishedArticleSlugs: ReadonlySet<string>,
  now = new Date(),
): NewsFeedItem[] {
  const today = now.toISOString().slice(0, 10);
  const items: NewsFeedItem[] = [];
  const seenSlugs = new Set<string>();
  const fileSources = new Map<string, ReviewedNews[]>();
  const seenFileEvents = new Set<string>();

  for (const record of reviewed) {
    if (record.announcedAt > today || record.reviewedAt > today || seenSlugs.has(record.slug)) continue;
    const source = canonicalNewsSource(record.sources[0].url);
    // Rolling changelogs may report multiple distinct events on the same day.
    // A normalized headline identifies each event while suppressing mirrors.
    const eventIdentity = record.sources[0].scope === "timeline" ? `|${normalizedTitle(record.title)}` : "";
    const eventKey = `${source}|${record.announcedAt}${eventIdentity}`;
    if (seenFileEvents.has(eventKey)) continue;
    seenFileEvents.add(eventKey);
    seenSlugs.add(record.slug);
    const sourceRecords = fileSources.get(source) ?? [];
    sourceRecords.push(record);
    fileSources.set(source, sourceRecords);
    items.push({
      id: `news:${record.slug}`,
      publicationId: null,
      companySlug: record.companySlug ?? null,
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      company: record.company,
      product: record.product,
      category: record.category,
      announcedAt: record.announcedAt,
      eventDate: record.eventDate,
      publishedAt: null,
      dateNote: record.dateNote,
      availability: record.availability,
      sources: record.sources,
      articlePath: null,
      timelineDate: record.announcedAt,
    });
  }

  const seenDatabaseSources = new Set<string>();
  const sortedPublished = [...published].sort((a, b) =>
    Date.parse(b.published_at) - Date.parse(a.published_at) || a.slug.localeCompare(b.slug),
  );
  for (const record of sortedPublished) {
    if (Date.parse(record.published_at) > now.getTime()) continue;
    const hasArticle = publishedArticleSlugs.has(record.slug);
    // A DB row must not resurrect an unpublished, removed, or draft MDX page.
    if (record.content_path && (!hasArticle || record.content_path !== `/updates/${record.slug}`)) continue;
    if (!record.source_url && !hasArticle) continue;
    const source = record.source_url ? canonicalNewsSource(record.source_url) : null;
    const matchingFile = items.find((item) => item.announcedAt !== null && (
      item.slug === record.slug || (source !== null && canonicalNewsSource(item.sources[0].url) === source &&
        (fileSources.get(source)?.some((match) => match.slug === item.slug && match.sources[0].scope === "event") || normalizedTitle(item.title) === normalizedTitle(record.title)))
    ));
    if (matchingFile) {
      // Keep the reviewed public text/date, but retain a real publication UUID
      // and company relation for the Bell's existing authenticated read state.
      if (!matchingFile.publicationId) {
        matchingFile.publicationId = record.id;
        matchingFile.companySlug ??= record.company_slug ?? null;
          if (hasArticle) matchingFile.articlePath = `/updates/${record.slug}`;
      }
      continue;
    }
    if (seenSlugs.has(record.slug)) continue;
    if (source) {
      const matches = fileSources.get(source) ?? [];
      // File records carry stronger date/category evidence. Prefer those to a
      // mirrored DB publication. Shared changelogs also require title identity.
      const isTimeline = matches.some((match) => match.sources[0].scope === "timeline");
      if (matches.some((match) => match.sources[0].scope === "event" || normalizedTitle(match.title) === normalizedTitle(record.title))) continue;
      const key = isTimeline ? `${source}|${normalizedTitle(record.title)}` : source;
      if (seenDatabaseSources.has(key)) continue;
      seenDatabaseSources.add(key);
    }
    seenSlugs.add(record.slug);
    items.push({
      id: `published:${record.id}`,
      publicationId: record.id,
      companySlug: record.company_slug ?? null,
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      company: null,
      product: null,
      category: "Watchlist update",
      announcedAt: null,
      eventDate: null,
      publishedAt: record.published_at,
      dateNote: "This is the Watchlist publication date. The source announcement and actual event dates are not established.",
      availability: null,
      sources: record.source_url ? [{ label: "Original source", url: record.source_url }] : [],
      articlePath: hasArticle ? `/updates/${record.slug}` : null,
      timelineDate: record.published_at.slice(0, 10),
    });
  }
  return items.sort((a, b) => b.timelineDate.localeCompare(a.timelineDate) || a.slug.localeCompare(b.slug));
}

export type NewsYearGroup = {
  year: string;
  months: { key: string; label: string; items: NewsFeedItem[] }[];
};

export function groupPublicNews(items: readonly NewsFeedItem[]): NewsYearGroup[] {
  const years = new Map<string, NewsYearGroup>();
  for (const item of [...items].sort((a, b) => b.timelineDate.localeCompare(a.timelineDate) || a.slug.localeCompare(b.slug))) {
    const year = item.timelineDate.slice(0, 4);
    const key = item.timelineDate.slice(0, 7);
    let yearGroup = years.get(year);
    if (!yearGroup) {
      yearGroup = { year, months: [] };
      years.set(year, yearGroup);
    }
    let month = yearGroup.months.find((entry) => entry.key === key);
    if (!month) {
      month = {
        key,
        label: new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)),
        items: [],
      };
      yearGroup.months.push(month);
    }
    month.items.push(item);
  }
  return [...years.values()];
}
