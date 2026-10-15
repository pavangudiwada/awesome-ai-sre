import "server-only";

import { getPostgresClient } from "@/db";
import { getPublishedContentDocuments } from "@/lib/catalog/content";
import reviewedNewsData from "../../../data/reviewed-news.json";
import { mergePublicNews, type NewsFeedItem } from "./feed";
import { publishedNewsRowSchema, reviewedNewsCollectionSchema, type PublishedNewsRow } from "./schema";

export type PublicNewsFeed = {
  items: NewsFeedItem[];
  publicationStatus: "available" | "unavailable" | "partial";
};

export async function getPublicNewsFeed(now = new Date()): Promise<PublicNewsFeed> {
  const reviewed = reviewedNewsCollectionSchema.parse(reviewedNewsData);
  const articleSlugs = new Set(getPublishedContentDocuments("update").map((document) => document.metadata.slug));
  const published: PublishedNewsRow[] = [];
  let publicationStatus: PublicNewsFeed["publicationStatus"] = "available";
  try {
    // Intentionally separate from private-workflow queries and their catch/[]
    // fallback: an outage must not be mistaken for an unpublished ecosystem.
    const rows = await getPostgresClient()`
      select id::text as id, slug, company_slug, title, summary, source_url, content_path,
        to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as published_at
      from public.published_updates
      where published_at <= now() and retired_at is null
      order by published_at desc, slug asc
    `;
    for (const row of rows) {
      const parsed = publishedNewsRowSchema.safeParse(row);
      if (parsed.success) published.push(parsed.data);
      else publicationStatus = "partial";
    }
  } catch {
    // Keep both the reviewed file-backed feed and a recoverable visible state.
    // Do not expose database errors, connection strings, or session details.
    publicationStatus = "unavailable";
  }
  return { items: mergePublicNews(reviewed, published, articleSlugs, now), publicationStatus };
}
