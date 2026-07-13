import type { MetadataRoute } from "next";

import {
  getCompanies,
  getObservabilityProducts,
  getProducts,
  getPublishedContentDocuments,
} from "@/lib/catalog";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/tools",
    "/observability",
    "/resources",
    "/updates",
    "/methodology",
    "/editorial-policy",
    "/privacy",
    "/terms",
  ];
  return [
    ...staticRoutes.map((route) => ({ url: `${origin}${route}`, changeFrequency: "weekly" as const })),
    ...getProducts().map((product) => ({
      url: `${origin}/tools/${product.slug}`,
      lastModified: product.screenshotLastFetched ?? product.dateAdded,
      changeFrequency: "weekly" as const,
    })),
    ...getObservabilityProducts().map((product) => ({
      url: `${origin}/observability/${product.slug}`,
      lastModified: product.lastReviewed,
      changeFrequency: "monthly" as const,
    })),
    ...getCompanies().map((company) => ({
      url: `${origin}/companies/${company.slug}`,
      changeFrequency: "weekly" as const,
    })),
    ...getPublishedContentDocuments().map((document) => ({
      url: `${origin}/${
        document.metadata.kind === "resource"
          ? "resources"
          : document.metadata.kind === "comparison"
            ? "comparisons"
            : document.metadata.kind
      }/${document.metadata.slug}`,
      lastModified: document.metadata.updatedAt ?? document.metadata.publishedAt,
      changeFrequency: "monthly" as const,
    })),
  ];
}
