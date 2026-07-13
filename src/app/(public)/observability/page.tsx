import type { Metadata } from "next";

import { saveProductAction } from "@/actions/workflows";
import { CatalogDirectory, type DirectoryProduct } from "@/components/catalog/catalog-directory";
import { getObservabilityProducts } from "@/lib/catalog";
import { toObservabilitySummary } from "@/lib/presentation/catalog";
import { getSavedProductSlugs } from "@/lib/workflows/queries";

export const metadata: Metadata = {
  title: "Observability tools",
  description:
    "Browse observability products by signals, deployment, ecosystem, and open-source status.",
  alternates: { canonical: "/observability" },
};

function normalizeDeployment(values: readonly string[]) {
  const normalized = new Set<string>();
  for (const value of values) {
    const lower = value.toLowerCase();
    if (lower.includes("cloud") || lower.includes("saas")) normalized.add("saas");
    if (lower.includes("self") || lower.includes("on-prem")) normalized.add("on-prem");
    if (lower.includes("hybrid")) normalized.add("hybrid");
  }
  return [...normalized];
}

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = getObservabilityProducts();
  const directoryProducts: DirectoryProduct[] = products.map((product) => ({
    product: toObservabilitySummary(product),
    categories: [
      "observability",
      ...(product.openSourceStatus !== "Commercial" ? ["oss"] : []),
    ],
    deployment: normalizeDeployment(product.deployment),
  }));
  const savedSlugs = await getSavedProductSlugs();

  return (
    <main className="flex flex-col gap-8 py-10">
      <header className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Observability landscape</p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find the telemetry foundation behind your incident workflow
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Compare signals, deployment models, ecosystems, and use cases. Save or evaluate products without automatically following a company.
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
