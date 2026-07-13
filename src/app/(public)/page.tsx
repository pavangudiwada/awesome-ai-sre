import Link from "next/link";
import { ArrowRightIcon, BookmarkIcon, SearchCheckIcon, SquareLibraryIcon } from "lucide-react";

import { saveProductAction } from "@/actions/workflows";
import { MarketplaceHero, ProductCard } from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  getCompanies,
  getEarlyCohort,
  getProducts,
} from "@/lib/catalog";
import { companyMap, toProductSummary } from "@/lib/presentation/catalog";
import { getSavedProductSlugs } from "@/lib/workflows/queries";
import type { CatalogProduct } from "@/types/catalog";

export default async function HomePage() {
  const products = getProducts();
  const companies = getCompanies();
  const companiesBySlug = companyMap(companies);
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const cohort = getEarlyCohort();
  const featured = cohort.entries
    .map((entry) => productsBySlug.get(entry.productSlug))
    .filter(
      (product): product is CatalogProduct =>
        product !== undefined && product.screenshot !== undefined,
    )
    .slice(0, 3);
  const savedSlugs = new Set(await getSavedProductSlugs());

  return (
    <main>
      <MarketplaceHero />

      <section className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <p className="text-sm font-medium text-primary">A useful place to start</p>
            <h2 className="text-3xl font-semibold tracking-tight">Explore the first products in the Watchlist</h2>
            <p className="text-muted-foreground">
              Read the overview, check deployment details, and follow the sources that matter to your evaluation.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/tools">
              Browse all products
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      </section>

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
                <ItemTitle>Keep track when ready</ItemTitle>
                <ItemDescription>Browse freely, then sign in only if you want to save products or add private notes.</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </div>
      </section>
    </main>
  );
}
