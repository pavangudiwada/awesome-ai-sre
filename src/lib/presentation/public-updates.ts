import "server-only";

import { getPublicNewsFeed, type PublicNewsFeed } from "@/lib/news/public-feed";

export type PublicHeaderUpdate = {
  id: string;
  slug: string;
  company_slug: string | null;
  company_name: string | null;
  title: string;
  summary: string;
  href: string;
  date: string;
  date_basis: "announced" | "published";
  event_date: string | null;
  category: string;
};

export type PublicHeaderFeed = {
  updates: PublicHeaderUpdate[];
  publicationStatus: PublicNewsFeed["publicationStatus"];
};

// Use the same source/slug merge and chronology as Global Updates. In
// particular, do not cache an unavailable DB result as an empty public feed.
export async function getPublicHeaderFeed(): Promise<PublicHeaderFeed> {
  const feed = await getPublicNewsFeed();
  return {
    publicationStatus: feed.publicationStatus,
    updates: feed.items.slice(0, 12).map((item) => ({
      id: item.publicationId ?? item.id,
      slug: item.slug,
      company_slug: item.companySlug,
      company_name: item.company,
      title: item.title,
      summary: item.summary,
      href: item.sources[0]?.url ?? item.articlePath!,
      date: item.announcedAt ?? item.publishedAt!,
      date_basis: item.announcedAt ? "announced" : "published",
      event_date: item.eventDate,
      category: item.category,
    })),
  };
}

export async function getPublicHeaderUpdates(): Promise<PublicHeaderUpdate[]> {
  return (await getPublicHeaderFeed()).updates;
}
