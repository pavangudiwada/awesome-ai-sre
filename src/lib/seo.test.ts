import { afterEach, describe, expect, it, vi } from "vitest";

import {
  articleStructuredData,
  breadcrumbStructuredData,
  publicPageMetadata,
  publicUrl,
  serializeJsonLd,
  siteStructuredData,
} from "./seo";

afterEach(() => vi.unstubAllEnvs());

describe("public discovery metadata", () => {
  it("keeps canonical and social metadata page-specific", () => {
    const metadata = publicPageMetadata({
      title: "AI SRE tools",
      description: "Browse source-linked AI SRE tools.",
      path: "/tools",
    });
    expect(metadata.alternates?.canonical).toBe("/tools");
    expect(metadata.openGraph).toMatchObject({
      title: "AI SRE tools",
      description: metadata.description,
      url: "/tools",
      siteName: "AI SRE Watchlist",
    });
    expect(metadata.twitter).toMatchObject({ title: metadata.title, description: metadata.description });
  });

  it("uses the configured origin without duplicate slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://aisrewatchlist.com/");
    expect(publicUrl("/tools/holmesgpt")).toBe("https://aisrewatchlist.com/tools/holmesgpt");
    expect(publicUrl("/#website")).toBe("https://aisrewatchlist.com/#website");
  });

  it("connects the real project identities without creating ratings", () => {
    const data = siteStructuredData();
    expect(data["@graph"].map((entity) => entity["@type"])).toEqual(["Organization", "WebSite"]);
    expect(data["@graph"][0].sameAs).toEqual(["https://www.linkedin.com/company/112729107/"]);
    expect(data["@graph"][1].sameAs).toEqual(["https://github.com/pavangudiwada/awesome-ai-sre"]);
    expect(data["@graph"][1].alternateName).toBe("Awesome AI SRE");
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|reviewRating|offers/);
  });

  it("describes only the breadcrumb levels visible on the page", () => {
    const data = breadcrumbStructuredData("/tools", "Tools", "HolmesGPT");
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Tools", item: "https://aisrewatchlist.com/tools" },
      { "@type": "ListItem", position: 2, name: "HolmesGPT" },
    ]);
  });

  it("uses editorial authors and dates from the visible article metadata", () => {
    const data = articleStructuredData({
      kind: "resource", title: "Pilot scorecard", slug: "pilot-scorecard",
      description: "Plan an AI SRE pilot.", status: "published", tags: [],
      authors: ["Pavan Gudiwada"], publishedAt: "2026-07-10", updatedAt: "2026-09-01",
    }, "/resources/pilot-scorecard");
    expect(data).toMatchObject({
      "@type": "Article", headline: "Pilot scorecard",
      datePublished: "2026-07-10", dateModified: "2026-09-01",
      author: [{ "@type": "Person", name: "Pavan Gudiwada" }],
      url: "https://aisrewatchlist.com/resources/pilot-scorecard",
    });
  });

  it("does not manufacture missing article dates", () => {
    const data = articleStructuredData({
      kind: "resource", title: "Guide", slug: "guide", description: "A guide",
      status: "published", tags: [], authors: [],
    }, "/resources/guide");
    expect(JSON.parse(serializeJsonLd(data))).not.toHaveProperty("datePublished");
    expect(JSON.parse(serializeJsonLd(data))).not.toHaveProperty("dateModified");
  });

  it("prevents catalog text from closing the JSON-LD script element", () => {
    const data = { name: "</script><script>alert('x')</script>" };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
