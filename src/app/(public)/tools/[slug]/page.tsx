import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileQuestionIcon } from "lucide-react";

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
import { ConnectedProductNoteEditor } from "@/components/workflow/product-note-editor";
import { LockedWorkflowPreview } from "@/components/workflow/locked-workflow-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  getCompanyBySlug,
  getProductBySlug,
  getProducts,
} from "@/lib/catalog";
import {
  companySources,
  productBadges,
  productEvidenceClaims,
  productFacts,
  productResourceLinks,
} from "@/lib/presentation/catalog";
import { getProductWorkflowState } from "@/lib/workflows/queries";

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/tools/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: `/tools/${product.slug}`,
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const company = product.companySlug
    ? getCompanyBySlug(product.companySlug)
    : undefined;
  const workflow = await getProductWorkflowState(product.slug, product.companySlug);
  const canonicalUrl = new URL(
    `/tools/${product.slug}`,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev",
  ).href;
  const resources = productResourceLinks(product);

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PublicProfileView subject={{ kind: "product", slug: product.slug }} />
      <WatchlistBreadcrumb
        parentHref="/tools"
        parentLabel="Tools"
        currentLabel={product.name}
      />

      <ProductProfileHeader
        name={product.name}
        summary={product.summary}
        logoSrc={product.logo}
        screenshotSrc={product.screenshot}
        companyName={company?.name}
        companyHref={company ? `/companies/${company.slug}` : undefined}
        websiteHref={product.url}
        analyticsSubject={{ kind: "product", slug: product.slug }}
        badges={productBadges(product)}
        actions={
          <ProfileProductActions
            productSlug={product.slug}
            productName={product.name}
            saved={workflow.saved}
            saveAction={saveProductAction}
            evaluationHref={`/workspace/evaluations/new?product=${product.slug}`}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 flex min-w-0 flex-col gap-6 xl:order-1 xl:row-span-2">
          <ProfileFactGrid facts={productFacts(product)} />

          <ProfileSection
            title="Catalog overview"
            description="A concise description from the catalog source. It is not an independent product review."
          >
            <div className="flex flex-col gap-5">
              <p className="max-w-3xl leading-relaxed">{product.summary}</p>
              {product.features.length ? (
                <div className="flex flex-col gap-3">
                  <h3 className="font-medium">Documented catalog capabilities</h3>
                  <ItemGroup className="grid sm:grid-cols-2">
                    {product.features.map((feature) => (
                      <Item key={feature} variant="muted" className="items-start">
                        <ItemContent>
                          <ItemTitle className="line-clamp-none leading-relaxed">
                            {feature}
                          </ItemTitle>
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                </div>
              ) : (
                <Alert>
                  <FileQuestionIcon />
                  <AlertTitle>Capability review pending</AlertTitle>
                  <AlertDescription>
                    No reviewed capability list is attached to this profile yet.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ProfileSection>

          <EvidenceSection claims={productEvidenceClaims(product, company)} />
          <SourceList
            sources={company ? companySources(company) : []}
            analyticsSubject={{ kind: "product", slug: product.slug }}
          />

          {workflow.signedIn ? (
            <ConnectedProductNoteEditor
              productSlug={product.slug}
              productName={product.name}
              initialValue={workflow.note}
            />
          ) : (
            <LockedWorkflowPreview returnTo={`/tools/${product.slug}`} />
          )}
        </div>

        <aside className="order-1 flex flex-col gap-4 xl:order-2 xl:sticky xl:top-24 xl:self-start">
          <ProfileSharingCard
            productName={product.name}
            productSlug={product.slug}
            canonicalUrl={canonicalUrl}
          />
          <OfficialResourcesCard
            productName={product.name}
            productSlug={product.slug}
            resources={resources}
          />
          <div className="hidden xl:block">
            <ProductResearchActions
              productSlug={product.slug}
              companySlug={company?.slug}
            />
          </div>
        </aside>
        <div className="order-3 xl:hidden">
          <ProductResearchActions
            productSlug={product.slug}
            companySlug={company?.slug}
          />
        </div>
      </div>
    </main>
  );
}

function ProductResearchActions({
  productSlug,
  companySlug,
}: {
  productSlug: string;
  companySlug?: string;
}) {
  return (
    <ProfileSection
      title="Research actions"
      description="These actions stay separate by design."
    >
      <div className="flex flex-col gap-3">
        <Button asChild variant="outline" className="justify-start">
          <Link href={`/submit/correction?product=${productSlug}`}>
            Submit a correction
          </Link>
        </Button>
        {companySlug ? (
          <Button asChild variant="outline" className="justify-start">
            <Link href={`/companies/${companySlug}`}>
              View company and follow updates
            </Link>
          </Button>
        ) : null}
      </div>
    </ProfileSection>
  );
}
