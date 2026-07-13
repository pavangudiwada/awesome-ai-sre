import type { MetadataRoute } from "next";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/workspace/", "/settings", "/auth/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
