import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkIcon,
  Building2Icon,
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
  getEarlyCohort,
  getProducts,
  getResources,
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
  const cohortProducts = cohort.entries
    .map((entry) => productsBySlug.get(entry.productSlug))
    .filter(
      (product): product is CatalogProduct =>
        product !== undefined,
    );
  const featured = [...cohortProducts, ...products]
    .filter((product, index, collection) =>
      collection.findIndex((candidate) => candidate.slug === product.slug) === index,
    )
    .slice(0, 12);
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
  const allResources = getResources();
  const resources = allResources.slice(0, 3);
  const savedSlugs = new Set(await getSavedProductSlugs());

  return (
    <main>
      <MarketplaceHero />

      <section className="border-b" aria-label="Start exploring the Watchlist">
        <div className="mx-auto grid max-w-screen-2xl gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="h-auto min-h-11 justify-start px-3 py-2">
            <Link href="/tools">
              <SquareLibraryIcon data-icon="inline-start" />
              <span className="text-left">
                <span className="block font-medium">{products.length} product profiles</span>
                <span className="block text-xs text-muted-foreground">Compare capabilities and sources</span>
              </span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto min-h-11 justify-start px-3 py-2">
            <Link href="/companies">
              <Building2Icon data-icon="inline-start" />
              <span className="text-left">
                <span className="block font-medium">{companies.length} company profiles</span>
                <span className="block text-xs text-muted-foreground">See products and official references</span>
              </span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto min-h-11 justify-start px-3 py-2">
            <Link href="/resources">
              <SearchCheckIcon data-icon="inline-start" />
              <span className="text-left">
                <span className="block font-medium">{allResources.length} research guides</span>
                <span className="block text-xs text-muted-foreground">Use a repeatable evaluation process</span>
              </span>
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <p className="text-sm font-medium text-primary">Product directory</p>
            <h2 className="text-3xl font-semibold tracking-tight">Start with a useful cross-section of the catalog</h2>
            <p className="text-muted-foreground">
              Read the overview, check deployment details, and inspect the sources that matter to your evaluation.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/tools">
              Browse all products
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
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
      </section>

      <section id="newsletter" className="border-y bg-muted/30" aria-labelledby="newsletter-heading">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,0.6fr)] lg:px-8">
          <div className="flex max-w-xl flex-col gap-3 self-center">
            <p className="text-sm font-medium text-primary">Watchlist newsletter</p>
            <h2 id="newsletter-heading" className="text-3xl font-semibold tracking-tight">
              Keep up with material AI SRE changes
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Choose a weekly digest or monthly roundup of source-linked changes worth a reliability team&apos;s attention. This subscription is separate from your account and company follows.
            </p>
          </div>
          <NewsletterSignup
            title="A calmer way to follow the space"
            description="Select the cadence that works for you. You can unsubscribe at any time."
          />
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
