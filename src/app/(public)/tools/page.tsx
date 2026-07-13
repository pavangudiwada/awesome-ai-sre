import type { Metadata } from "next";

import { saveProductAction } from "@/actions/workflows";
import { CatalogDirectory, type DirectoryProduct } from "@/components/catalog/catalog-directory";
import { getCompanies, getProducts } from "@/lib/catalog";
import { companyMap, toProductSummary } from "@/lib/presentation/catalog";
import { getSavedProductSlugs } from "@/lib/workflows/queries";

export const metadata: Metadata = {
  title: "AI SRE tools",
  description:
    "Browse AI incident-response, AIOps, runbook, and reliability products with explicit evidence status.",
  alternates: { canonical: "/tools" },
};

const TAG_CATEGORIES: Record<string, string> = {
  "Incident Response": "incident-ai",
  Observability: "observability",
  AIOps: "aiops",
  IDP: "ai-sre",
  IaC: "ai-sre",
  FinOps: "ai-sre",
  Security: "learning",
  Deployment: "runbooks",
};

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = getProducts();
  const companies = companyMap(getCompanies());
  const directoryProducts: DirectoryProduct[] = products.map((product) => ({
    product: toProductSummary(product, companies),
    categories: [
      ...new Set(product.tags.map((tag) => TAG_CATEGORIES[tag] ?? "other")),
      ...(product.openSource ? ["oss"] : []),
    ],
    deployment: [...product.deployment],
    dateAdded: product.dateAdded,
  }));
  const savedSlugs = await getSavedProductSlugs();

  return (
    <main className="flex flex-col gap-8 py-10">
      <header className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">AI reliability marketplace</p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Products for investigating and improving reliability
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Search the full catalog. Product claims remain unreviewed until a source is attached, and missing pricing or evidence is shown as unknown.
        </p>
      </header>
      <CatalogDirectory
        products={directoryProducts}
        savedSlugs={savedSlugs}
        initialQuery={q}
        saveAction={saveProductAction}
      />
    </main>
  );
}
