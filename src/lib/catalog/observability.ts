import type {
  CatalogValidationIssue,
  ObservabilityProduct,
} from "../../types/catalog";
import { OBSERVABILITY_TOOLS } from "../../data/observability.js";
import { throwForCatalogIssues } from "./errors";
import { observabilityProductSourceSchema } from "./schemas";

export interface ObservabilityCollectionResult {
  readonly products: readonly ObservabilityProduct[];
  readonly issues: readonly CatalogValidationIssue[];
}

export function collectObservabilityProducts(): ObservabilityCollectionResult {
  const sourceFile = "src/data/observability.js";
  const rawProducts: unknown = OBSERVABILITY_TOOLS;
  if (!Array.isArray(rawProducts)) {
    return {
      products: [],
      issues: [
        {
          severity: "error",
          code: "observability_not_array",
          sourceFile,
          message: "OBSERVABILITY_TOOLS must export an array",
        },
      ],
    };
  }

  const products: ObservabilityProduct[] = [];
  const issues: CatalogValidationIssue[] = [];

  rawProducts.forEach((rawProduct, index) => {
    const result = observabilityProductSourceSchema.safeParse(rawProduct);
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          severity: "error" as const,
          code: "observability_schema_error",
          sourceFile,
          message: `[${index}].${issue.path.join(".") || "root"}: ${issue.message}`,
        })),
      );
      return;
    }

    const product = result.data;
    products.push({
      catalogFamily: "observability",
      name: product.name,
      slug: product.slug,
      companySlug: null,
      url: product.url,
      summary: product.summary,
      ...(product.screenshot ? { screenshot: product.screenshot } : {}),
      ...(product.logo ? { logo: product.logo } : {}),
      type: product.type,
      openSourceStatus: product.ossStatus,
      signals: product.signals,
      layers: product.layers,
      ecosystem: product.ecosystem,
      deployment: product.deployment,
      useCases: product.useCases,
      links: product.links,
      lastReviewed: product.lastReviewed,
      sourceFile,
    });
  });

  return {
    products: products.sort((left, right) => left.slug.localeCompare(right.slug)),
    issues,
  };
}

export function getObservabilityProducts(): readonly ObservabilityProduct[] {
  const result = collectObservabilityProducts();
  throwForCatalogIssues("Observability catalog is invalid", result.issues);
  return result.products;
}

export function getObservabilityProductBySlug(
  slug: string,
): ObservabilityProduct | undefined {
  return getObservabilityProducts().find((product) => product.slug === slug);
}
