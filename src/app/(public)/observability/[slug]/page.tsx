import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveProductAction } from "@/actions/workflows";
import { PublicProfileView } from "@/components/analytics/public-events";
import {
  EvidenceSection,
  OfficialResourcesCard,
  ProductProfileHeader,
  ProfileFactGrid,
  ProfileProductActions,
  ProfileSharingCard,
  ProfileSection,
  SourceList,
  WatchlistBreadcrumb,
} from "@/components/watchlist";
import type { SourceReference } from "@/components/watchlist/types";
import { ConnectedProductNoteEditor } from "@/components/workflow/product-note-editor";
import { LockedWorkflowPreview } from "@/components/workflow/locked-workflow-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  getObservabilityProductBySlug,
  getObservabilityProducts,
} from "@/lib/catalog";
import {
  observabilityEvidenceClaims,
  observabilityFacts,
  observabilityResourceLinks,
  observabilityWorkflowSlug,
} from "@/lib/presentation/catalog";
import { getProductWorkflowState } from "@/lib/workflows/queries";

export function generateStaticParams() {
  return getObservabilityProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getObservabilityProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/observability/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: `/observability/${product.slug}`,
      type: "website",
      images: product.screenshot
        ? [{ url: product.screenshot }]
        : product.logo
          ? [{ url: product.logo }]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.summary,
      images: product.screenshot ? [product.screenshot] : product.logo ? [product.logo] : undefined,
    },
  };
}

export default async function ObservabilityProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getObservabilityProductBySlug(slug);
  if (!product) notFound();
  const workflowSlug = observabilityWorkflowSlug(product.slug);
  const workflow = await getProductWorkflowState(workflowSlug);
  const canonicalUrl = new URL(
    `/observability/${product.slug}`,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev",
  ).href;
  const resources = observabilityResourceLinks(product);
  const sources: SourceReference[] = [
    { id: "website", title: "Official website", href: product.url, sourceType: "First-party source" },
    ...Object.entries(product.links).map(([type, href]) => ({
      id: type,
      title: `Official ${type}`,
      href,
      sourceType: "First-party source",
    })),
  ];

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PublicProfileView subject={{ kind: "product", slug: workflowSlug }} />
      <WatchlistBreadcrumb
        parentHref="/observability"
        parentLabel="Observability"
        currentLabel={product.name}
      />

      <ProductProfileHeader
        name={product.name}
        summary={product.summary}
        logoSrc={product.logo}
        screenshotSrc={product.screenshot}
        websiteHref={product.url}
        analyticsSubject={{ kind: "product", slug: workflowSlug }}
        badges={[
          { label: product.type, tone: "secondary" },
          { label: product.openSourceStatus, tone: "outline" },
        ]}
        lastReviewedLabel={product.lastReviewed}
        actions={
          <ProfileProductActions
            productSlug={workflowSlug}
            productName={product.name}
            saved={workflow.saved}
            saveAction={saveProductAction}
            returnTo={`/observability/${product.slug}`}
            evaluationHref={`/workspace/evaluations/new?product=${product.slug}`}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 flex min-w-0 flex-col gap-6 xl:order-1 xl:row-span-2">
          <ProfileFactGrid facts={observabilityFacts(product)} />
          <ProfileSection
            title="Signals and use cases"
            description="Structured catalog metadata, not a performance rating."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                {[...product.signals, ...product.layers, ...product.ecosystem].map((value) => (
                  <Badge key={value} variant="secondary">{value}</Badge>
                ))}
              </div>
              <ItemGroup className="grid sm:grid-cols-2">
                {product.useCases.map((useCase) => (
                  <Item key={useCase} variant="muted" className="items-start">
                    <ItemContent>
                      <ItemTitle className="line-clamp-none leading-relaxed">
                        {useCase}
                      </ItemTitle>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </div>
          </ProfileSection>
          <EvidenceSection claims={observabilityEvidenceClaims(product)} />
          <SourceList
            sources={sources}
            analyticsSubject={{ kind: "product", slug: workflowSlug }}
          />
          {workflow.signedIn ? (
            <ConnectedProductNoteEditor
              productSlug={workflowSlug}
              productName={product.name}
              initialValue={workflow.note}
            />
          ) : (
            <LockedWorkflowPreview returnTo={`/observability/${product.slug}`} />
          )}
        </div>
        <aside className="order-1 flex flex-col gap-4 xl:order-2 xl:sticky xl:top-24 xl:self-start">
          <ProfileSharingCard
            productName={product.name}
            productSlug={workflowSlug}
            canonicalUrl={canonicalUrl}
          />
          <OfficialResourcesCard
            productName={product.name}
            productSlug={workflowSlug}
            resources={resources}
          />
          <div className="hidden xl:block">
            <ObservabilityResearchActions productSlug={workflowSlug} />
          </div>
        </aside>
        <div className="order-3 xl:hidden">
          <ObservabilityResearchActions productSlug={workflowSlug} />
        </div>
      </div>
    </main>
  );
}

function ObservabilityResearchActions({ productSlug }: { productSlug: string }) {
  return (
    <ProfileSection
      title="Research actions"
      description="Company follow is available only after a curated company mapping exists."
    >
      <Button asChild variant="outline" className="w-full justify-start">
        <Link href={`/submit/correction?product=${productSlug}`}>
          Submit a correction
        </Link>
      </Button>
    </ProfileSection>
  );
}
