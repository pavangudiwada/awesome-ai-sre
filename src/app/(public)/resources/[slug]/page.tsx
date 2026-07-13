import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MdxArticle } from "@/components/content/mdx-article";
import { WatchlistBreadcrumb } from "@/components/watchlist";
import { Badge } from "@/components/ui/badge";
import { getPublishedContentDocument, getPublishedContentDocuments } from "@/lib/catalog";

export function generateStaticParams() {
  return getPublishedContentDocuments("resource").map((document) => ({
    slug: document.metadata.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const document = getPublishedContentDocument("resource", slug);
  if (!document) return {};
  return {
    title: document.metadata.title,
    description: document.metadata.description,
    alternates: { canonical: `/resources/${slug}` },
    openGraph: {
      type: "article",
      title: document.metadata.title,
      description: document.metadata.description,
      url: `/resources/${slug}`,
      publishedTime: document.metadata.publishedAt,
      modifiedTime: document.metadata.updatedAt,
    },
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const document = getPublishedContentDocument("resource", slug);
  if (!document || document.metadata.kind !== "resource") notFound();
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <WatchlistBreadcrumb
        parentHref="/resources"
        parentLabel="Resources"
        currentLabel={document.metadata.title}
      />
      <header className="flex max-w-4xl flex-col gap-4 border-b pb-8">
        <Badge variant="outline" className="w-fit">{document.metadata.resourceType}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {document.metadata.title}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {document.metadata.description}
        </p>
        <p className="text-sm text-muted-foreground">
          By {document.metadata.authors.join(", ")} · Updated {document.metadata.updatedAt ?? document.metadata.publishedAt}
        </p>
      </header>
      <MdxArticle source={document.body} />
    </main>
  );
}
