import { getPublishedContentDocuments } from "@/lib/catalog";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const items = getPublishedContentDocuments()
    .filter((document) => document.metadata.publishedAt)
    .sort((left, right) => (right.metadata.publishedAt ?? "").localeCompare(left.metadata.publishedAt ?? ""))
    .map((document) => {
      const collection =
        document.metadata.kind === "resource"
          ? "resources"
          : document.metadata.kind === "comparison"
            ? "comparisons"
            : document.metadata.kind;
      const url = `${origin}/${collection}/${document.metadata.slug}`;
      return `<item><title>${escapeXml(document.metadata.title)}</title><link>${url}</link><guid>${url}</guid><description>${escapeXml(document.metadata.description)}</description><pubDate>${new Date(document.metadata.publishedAt!).toUTCString()}</pubDate></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AI SRE Watchlist</title><link>${origin}</link><description>Evidence-led AI SRE research and practitioner resources.</description>${items}</channel></rss>`;
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
