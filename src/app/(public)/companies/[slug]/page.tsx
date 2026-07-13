import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, Building2Icon, RssIcon } from "lucide-react";

import { followCompanyAction, saveProductAction } from "@/actions/workflows";
import { PublicProfileView } from "@/components/analytics/public-events";
import {
  CompanyFollowAction,
  ProductCard,
  ProductGrid,
  ProductProfileHeader,
  ProfileSection,
  SourceList,
  WatchlistBreadcrumb,
} from "@/components/watchlist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import {
  getCompanies,
  getCompanyBySlug,
  getProductsByCompanySlug,
} from "@/lib/catalog";
import {
  companyMap,
  companySources,
  toProductSummary,
} from "@/lib/presentation/catalog";
import {
  getCompanyFollowingState,
  getCompanyPublishedUpdates,
  getSavedProductSlugs,
} from "@/lib/workflows/queries";

export function generateStaticParams() {
  return getCompanies().map((company) => ({ slug: company.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) return {};
  return {
    title: company.name,
    description: `Products, official sources, and reviewed updates for ${company.name}.`,
    alternates: { canonical: `/companies/${company.slug}` },
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();
  const products = getProductsByCompanySlug(company.slug);
  const [following, savedSlugs, updates] = await Promise.all([
    getCompanyFollowingState(company.slug),
    getSavedProductSlugs(),
    getCompanyPublishedUpdates(company.slug),
  ]);
  const saved = new Set(savedSlugs);
  const companies = companyMap([company]);
  const firstProduct = products[0];

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PublicProfileView subject={{ kind: "company", slug: company.slug }} />
      <WatchlistBreadcrumb
        parentHref="/tools"
        parentLabel="Tools"
        currentLabel={company.name}
      />

      <ProductProfileHeader
        name={company.name}
        summary={
          products.length
            ? `${company.name} publishes ${products.map((product) => product.name).join(", ")}, ${products.length === 1 ? "a product" : "products"} tracked by the AI SRE Watchlist.`
            : `${company.name} is included in the Watchlist company research registry.`
        }
        logoSrc={firstProduct?.logo}
        screenshotSrc={firstProduct?.screenshot}
        websiteHref={company.website}
        websiteLabel="Visit company website"
        analyticsSubject={{ kind: "company", slug: company.slug }}
        badges={[
          { label: `${products.length} listed ${products.length === 1 ? "product" : "products"}`, tone: "secondary" },
          { label: company.mappingStatus === "confirmed" ? "Identity mapped" : "Mapping needs review", tone: "outline" },
        ]}
        actions={
          <CompanyFollowAction
            companySlug={company.slug}
            companyName={company.name}
            following={following}
            action={followCompanyAction}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileSection
            title="Products on the Watchlist"
            description="Saving a product does not follow this company. These are intentionally separate actions."
          >
            <ProductGrid>
              {products.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={toProductSummary(product, companies)}
                  saved={saved.has(product.slug)}
                  saveAction={saveProductAction}
                />
              ))}
            </ProductGrid>
          </ProfileSection>

          <SourceList
            sources={companySources(company)}
            analyticsSubject={{ kind: "company", slug: company.slug }}
          />

          <ProfileSection
            title="Reviewed company updates"
            description="Only Watchlist-reviewed submissions and source-linked company changes appear here."
          >
            {updates.length ? (
              <ItemGroup>
                {updates.map((update) => (
                  <Item key={update.id} asChild variant="outline" className="items-start">
                    <article>
                    <ItemHeader className="flex-wrap">
                      <Badge variant="outline">Reviewed update</Badge>
                      <time className="text-xs text-muted-foreground" dateTime={update.published_at}>
                        {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(update.published_at))}
                      </time>
                    </ItemHeader>
                    <ItemContent>
                      <ItemTitle className="line-clamp-none">{update.title}</ItemTitle>
                      <ItemDescription className="line-clamp-none">{update.summary}</ItemDescription>
                    </ItemContent>
                    <ItemFooter>
                    <Button asChild variant="link" className="h-11 px-0">
                      <Link href={`/updates/${update.slug}`}>
                        Read update
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    </Button>
                    </ItemFooter>
                    </article>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <Alert>
                <RssIcon />
                <AlertTitle>No reviewed updates published yet</AlertTitle>
                <AlertDescription>
                  Following this company will notify you after the Watchlist publishes a reviewed update. It does not expose your saves or evaluations.
                </AlertDescription>
              </Alert>
            )}
          </ProfileSection>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <ProfileSection title="Company actions" description="Company submissions are reviewed before publication.">
            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/submit/correction?company=${company.slug}`}>
                  Submit a correction
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/submit/update?company=${company.slug}`}>
                  <Building2Icon data-icon="inline-start" />
                  Submit a company update
                </Link>
              </Button>
            </div>
          </ProfileSection>
        </aside>
      </div>
    </main>
  );
}
