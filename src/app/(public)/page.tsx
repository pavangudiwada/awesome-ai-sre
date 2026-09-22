import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkIcon,
  SearchCheckIcon,
  SquareLibraryIcon,
} from "lucide-react";

import { saveProductAction } from "@/actions/workflows";
import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";
import { CompanyCard, MarketplaceHero, ProductCard } from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  getCompanies,
  getProducts,
  getResources,
  getRotatingFeaturedEntries,
} from "@/lib/catalog";
import { companyMap, toProductSummary } from "@/lib/presentation/catalog";
import { getSavedProductSlugs } from "@/lib/workflows/queries";
import type { CatalogProduct } from "@/types/catalog";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = getProducts();
  const companies = getCompanies();
  const companiesBySlug = companyMap(companies);
  const featured = getRotatingFeaturedEntries(products);
  const productsByCompany = new Map<string, CatalogProduct[]>();
  for (const product of products) {
    if (!product.companySlug) continue;
    const companyProducts = productsByCompany.get(product.companySlug) ?? [];
    companyProducts.push(product);
    productsByCompany.set(product.companySlug, companyProducts);
  }
  const featuredCompanies = [...companies]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 8);
  const resources = getResources().slice(0, 3);
  const savedSlugs = new Set(await getSavedProductSlugs());

  return (
    <main>
      <MarketplaceHero />

      <section id="newsletter" className="border-b" aria-label="Watchlist newsletter">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <NewsletterSignup
            compact
            title="Get the AI SRE Watchlist in your inbox"
            description="The most useful AI SRE product updates, delivered to your inbox."
          />
        </div>
      </section>

      <section className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="text-sm font-medium text-primary">Product directory</p>
          <h2 className="text-3xl font-semibold tracking-tight">Featured AI SRE tools</h2>
          <p className="text-muted-foreground">
            A rotating selection from the directory, refreshed every day.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-5">
          {featured.map((product, index) => {
            const summary = toProductSummary(product, companiesBySlug);
            return (
              <ProductCard
                key={product.slug}
                product={summary}
                saved={savedSlugs.has(product.slug)}
                saveAction={saveProductAction}
                mediaPriority={index < 3}
              />
            );
          })}
        </div>
        <div className="flex justify-center pt-2">
          <Button asChild size="lg" variant="outline" className="h-11">
            <Link href="/tools">
              View all {products.length} tools
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-3xl flex-col gap-2">
              <p className="text-sm font-medium text-primary">Company discovery</p>
              <h2 className="text-3xl font-semibold tracking-tight">Connect products to the teams behind them</h2>
              <p className="text-muted-foreground">
                Hover or focus a company name for a quick catalog summary, then open its profile for sources and reviewed updates.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/companies">
                Browse all companies
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
            {featuredCompanies.map((company) => (
              <CompanyCard
                key={company.slug}
                company={company}
                products={productsByCompany.get(company.slug) ?? []}
              />
            ))}
          </div>
        </div>
      </section>

      {resources.length ? (
        <section className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-3xl flex-col gap-2">
              <p className="text-sm font-medium text-primary">Research library</p>
              <h2 className="text-3xl font-semibold tracking-tight">Practical material for a more rigorous pilot</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/resources">
                View all guides
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <ItemGroup className="grid gap-3 md:grid-cols-3">
            {resources.map((resource) => (
              <Item key={resource.metadata.slug} asChild variant="outline" className="items-start bg-card">
                <Link href={`/resources/${resource.metadata.slug}`}>
                  <ItemMedia variant="icon"><SearchCheckIcon aria-hidden="true" /></ItemMedia>
                  <ItemContent>
                    <ItemTitle className="line-clamp-2">{resource.metadata.title}</ItemTitle>
                    <ItemDescription className="line-clamp-3">{resource.metadata.description}</ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            ))}
          </ItemGroup>
        </section>
      ) : null}

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:px-8 lg:py-16">
          <div className="flex max-w-md flex-col gap-3">
            <p className="text-sm font-medium text-primary">Built to make research simpler</p>
            <h2 className="text-3xl font-semibold tracking-tight">Useful information, without the vendor pitch.</h2>
            <p className="leading-relaxed text-muted-foreground">
              The Watchlist gives reliability teams a calm place to understand products before spending time on demos and trials.
            </p>
            <Button asChild variant="link" className="h-11 w-fit px-0">
              <Link href="/methodology">
                How the Watchlist researches products
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <ItemGroup className="grid gap-3 sm:grid-cols-3">
            <Item variant="outline" className="items-start bg-background">
              <ItemMedia variant="icon"><SquareLibraryIcon aria-hidden="true" /></ItemMedia>
              <ItemContent>
                <ItemTitle>Understand the product</ItemTitle>
                <ItemDescription>See the problem it addresses, key capabilities, and deployment options.</ItemDescription>
              </ItemContent>
            </Item>
            <Item variant="outline" className="items-start bg-background">
              <ItemMedia variant="icon"><SearchCheckIcon aria-hidden="true" /></ItemMedia>
              <ItemContent>
                <ItemTitle>Check the sources</ItemTitle>
                <ItemDescription>Inspect source-linked claims and see clearly when information is still unknown.</ItemDescription>
              </ItemContent>
            </Item>
            <Item variant="outline" className="items-start bg-background">
              <ItemMedia variant="icon"><BookmarkIcon aria-hidden="true" /></ItemMedia>
              <ItemContent>
                <ItemTitle>
                  Keep track when ready
                </ItemTitle>
                <ItemDescription>
                  Browse freely, then sign in only if you want to save products or add private notes.
                </ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </div>
      </section>
    </main>
  );
}
