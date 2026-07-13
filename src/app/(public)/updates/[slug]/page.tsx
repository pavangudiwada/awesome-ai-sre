import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MdxArticle } from "@/components/content/mdx-article";
import { PublicProfileView } from "@/components/analytics/public-events";
import { WatchlistBreadcrumb } from "@/components/watchlist";
import { Badge } from "@/components/ui/badge";
import { getPublishedContentDocument } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const document = getPublishedContentDocument("update", slug);
  if (!document) return {};
  return {
    title: document.metadata.title,
    description: document.metadata.description,
    alternates: { canonical: `/updates/${slug}` },
  };
}

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = getPublishedContentDocument("update", slug);
  if (!document || document.metadata.kind !== "update") notFound();
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PublicProfileView subject={{ kind: "update", slug: document.metadata.slug }} />
      <WatchlistBreadcrumb
        parentHref="/updates"
        parentLabel="Updates"
        currentLabel={document.metadata.title}
      />
      <header className="flex max-w-4xl flex-col gap-4 border-b pb-8">
        <Badge variant="outline" className="w-fit">Reviewed update</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{document.metadata.title}</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">{document.metadata.description}</p>
      </header>
      <MdxArticle source={document.body} />
    </main>
  );
}
