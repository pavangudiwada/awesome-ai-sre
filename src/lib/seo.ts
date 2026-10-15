import type { Metadata } from "next";

import { PROJECT_GITHUB_URL, PROJECT_LINKEDIN_URL } from "@/lib/public-project";
import type { BaseContentMetadata } from "@/types/catalog";

export const SITE_NAME = "AI SRE Watchlist";
export const SITE_DESCRIPTION =
  "Explore AI SRE tools and agents for incident response, root cause analysis, observability, and AIOps, with source-linked profiles and practical evaluation guides.";

export function publicUrl(path = "/"): string {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisrewatchlist.com").href;
}

/** Keep a page's canonical and social preview about the same public page. */
export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export function siteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": publicUrl("/#organization"),
        name: SITE_NAME,
        url: publicUrl(),
        sameAs: [PROJECT_LINKEDIN_URL],
      },
      {
        "@type": "WebSite",
        "@id": publicUrl("/#website"),
        name: SITE_NAME,
        alternateName: "Awesome AI SRE",
        url: publicUrl(),
        description: SITE_DESCRIPTION,
        sameAs: [PROJECT_GITHUB_URL],
        publisher: { "@id": publicUrl("/#organization") },
      },
    ],
  };
}

/** Match the two levels actually shown by WatchlistBreadcrumb. */
export function breadcrumbStructuredData(parentHref: string, parentLabel: string, currentLabel: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: parentLabel, item: publicUrl(parentHref) },
      { "@type": "ListItem", position: 2, name: currentLabel },
    ],
  };
}

/** Editorial articles only; vendor profiles are not reviews or ratings. */
export function articleStructuredData(metadata: BaseContentMetadata, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": publicUrl(`${path}#article`),
    url: publicUrl(path),
    mainEntityOfPage: { "@type": "WebPage", "@id": publicUrl(path) },
    headline: metadata.title,
    description: metadata.description,
    author: metadata.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: metadata.publishedAt,
    dateModified: metadata.updatedAt ?? metadata.publishedAt,
    publisher: { "@id": publicUrl("/#organization") },
    isAccessibleForFree: true,
  };
}

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
