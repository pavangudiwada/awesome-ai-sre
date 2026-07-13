import Link from "next/link";
import { ArrowRightIcon, BellIcon, FolderSearch2Icon } from "lucide-react";

import { saveProductAction } from "@/actions/workflows";
import { MarketplaceHero, ProductCard, ProductGrid } from "@/components/watchlist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCompanies,
  getEarlyCohort,
  getProducts,
  getPublishedContentDocuments,
} from "@/lib/catalog";
import { companyMap, toProductSummary } from "@/lib/presentation/catalog";
import { getSavedProductSlugs } from "@/lib/workflows/queries";

export default async function HomePage() {
  const products = getProducts();
  const companies = getCompanies();
  const companiesBySlug = companyMap(companies);
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const cohort = getEarlyCohort();
  const featured = cohort.entries
    .map((entry) => productsBySlug.get(entry.productSlug))
    .filter((product) => product !== undefined)
    .slice(0, 8);
  const resources = getPublishedContentDocuments("resource").slice(0, 3);
  const savedSlugs = new Set(await getSavedProductSlugs());

  return (
    <main>
      <div className="mx-auto max-w-screen-2xl px-4 pt-4 sm:px-6 lg:px-8">
        <Alert>
          <FolderSearch2Icon />
          <AlertTitle>Private evaluation workspace is now available</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
            Save products, keep private notes, build named evaluations, and follow reviewed company updates.
            <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create your workspace
            </Link>
          </AlertDescription>
        </Alert>
      </div>

      <MarketplaceHero
        proofPoints={[
          `${products.length} AI reliability products`,
          `${companies.length} researched companies`,
          "Unknown stays unknown",
        ]}
      />

      <section className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <p className="text-sm font-medium text-primary">Initial incident-response cohort</p>
            <h2 className="text-3xl font-semibold tracking-tight">Start with products under active review</h2>
            <p className="text-muted-foreground">
              These profiles are prioritized for deeper evidence review. Unreviewed facts are labeled rather than guessed.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/tools">
              Browse all products
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <ProductGrid>
          {featured.map((product, index) => {
            const summary = toProductSummary(product, companiesBySlug);
            return (
              <ProductCard
                key={product.slug}
                product={summary}
                saved={savedSlugs.has(product.slug)}
                saveAction={saveProductAction}
                mediaPriority={index < 8}
              />
            );
          })}
        </ProductGrid>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-primary">Practitioner resources</p>
            <h2 className="text-3xl font-semibold tracking-tight">Run a safer AI incident-response pilot</h2>
            <p className="max-w-3xl text-muted-foreground">
              Use transparent scorecards, security checks, and replay protocols before granting an agent production access.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {resources.map((resource) => (
              <Card key={resource.metadata.slug}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    {resource.metadata.kind === "resource"
                      ? resource.metadata.resourceType
                      : "resource"}
                  </Badge>
                  <CardTitle>{resource.metadata.title}</CardTitle>
                  <CardDescription>{resource.metadata.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Published {resource.metadata.publishedAt}
                </CardContent>
                <CardFooter>
                  <Button asChild variant="link" className="px-0">
                    <Link href={`/resources/${resource.metadata.slug}`}>
                      Open resource
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/resources">View all resources</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-screen-2xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card>
          <CardHeader>
            <BellIcon />
            <CardTitle>Follow companies without exposing your research</CardTitle>
            <CardDescription>
              Company follows power reviewed updates in your Bell. Saves, notes, and evaluations remain separate and private.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/tools">Find a company to follow</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <FolderSearch2Icon />
            <CardTitle>Move serious candidates into an evaluation</CardTitle>
            <CardDescription>
              Save broadly, then create a named evaluation only when a product becomes a real pilot candidate.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/workspace/evaluations">Open evaluations</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
