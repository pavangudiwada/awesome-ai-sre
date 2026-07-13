import { readdirSync } from "node:fs";
import path from "node:path";

import type { CatalogProduct, CatalogValidationIssue } from "../../types/catalog";
import { collectCompanies, getCompanySlugByProductSlug } from "./companies";
import { throwForCatalogIssues } from "./errors";
import { fromRepoRoot } from "./paths";
import { legacyProductSourceSchema, type LegacyProductSource } from "./schemas";
import { parseYamlFile, type ParsedSource } from "./yaml";

export interface ProductSourceCollectionResult {
  readonly products: readonly ParsedSource<LegacyProductSource>[];
  readonly issues: readonly CatalogValidationIssue[];
}

export function collectProductSources(): ProductSourceCollectionResult {
  const directory = fromRepoRoot("tools", "operate");
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort((left, right) => left.localeCompare(right));

  const products: ParsedSource<LegacyProductSource>[] = [];
  const issues: CatalogValidationIssue[] = [];

  for (const file of files) {
    const result = parseYamlFile(path.join(directory, file), legacyProductSourceSchema);
    issues.push(...result.issues);
    if (!result.parsed) {
      continue;
    }

    const expectedSlug = path.basename(file, ".yaml");
    if (result.parsed.value.slug !== expectedSlug) {
      issues.push({
        severity: "error",
        code: "product_filename_mismatch",
        sourceFile: result.parsed.sourceFile,
        message: `slug "${result.parsed.value.slug}" does not match filename "${expectedSlug}"`,
      });
    }
    products.push(result.parsed);
  }

  return { products, issues };
}

function normalizeProduct(
  source: ParsedSource<LegacyProductSource>,
  companySlug: string | null,
): CatalogProduct {
  const product = source.value;
  return {
    catalogFamily: "ai-sre",
    name: product.name,
    slug: product.slug,
    companySlug,
    url: product.url,
    summary: product.summary,
    deployment: product.deployment,
    openSource: product.opensource,
    tags: product.tags,
    dateAdded: product.dateAdded,
    ...(product.screenshot ? { screenshot: product.screenshot } : {}),
    ...(product.logo ? { logo: product.logo } : {}),
    ...(product.screenshot_last_fetched
      ? { screenshotLastFetched: product.screenshot_last_fetched }
      : {}),
    features: product.features ?? [],
    socialLinks: {
      ...(product.linkedin ? { linkedin: product.linkedin } : {}),
      ...(product.github ? { github: product.github } : {}),
      ...(product.x ? { x: product.x } : {}),
      ...(product.producthunt ? { producthunt: product.producthunt } : {}),
    },
    editorialState: "unreviewed",
    lastReviewed: null,
    sourceFile: source.sourceFile,
  };
}

export function getProducts(): readonly CatalogProduct[] {
  const productResult = collectProductSources();
  const companyResult = collectCompanies();
  throwForCatalogIssues("Product catalog is invalid", [
    ...productResult.issues,
    ...companyResult.issues,
  ]);

  const companyByProduct = getCompanySlugByProductSlug(companyResult.companies);
  return productResult.products
    .map((product) => normalizeProduct(product, companyByProduct.get(product.value.slug) ?? null))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return getProducts().find((product) => product.slug === slug);
}

export function getProductsByCompanySlug(companySlug: string): readonly CatalogProduct[] {
  return getProducts().filter((product) => product.companySlug === companySlug);
}
