import type {
  CatalogCompany,
  CatalogProduct,
  ObservabilityProduct,
  ProductResourceKind,
  ProductResourceLink,
} from "@/types/catalog";
import type {
  ProductBadge,
  EvidenceClaim,
  ProductFact,
  ProductSummary,
  SourceReference,
} from "@/components/watchlist/types";
import {
  getCompanies,
  getEarlyCohort,
  getObservabilityProducts,
  getProducts,
} from "@/lib/catalog";

const TAG_LABELS: Record<string, string> = {
  "Incident Response": "Incident AI",
  Observability: "Observability",
  AIOps: "AIOps",
  IDP: "AI SRE",
  IaC: "AI SRE",
  FinOps: "AI SRE",
  Security: "Learning",
  Deployment: "Runbooks",
};

const PRODUCT_RESOURCE_LABELS: Record<ProductResourceKind, string> = {
  website: "Official website",
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  producthunt: "Product Hunt",
  documentation: "Documentation",
  community: "Community",
};

export function companyMap(companies: readonly CatalogCompany[]) {
  return new Map(companies.map((company) => [company.slug, company]));
}

export function productBadges(product: CatalogProduct): ProductBadge[] {
  const labels = [...new Set(product.tags.map((tag) => TAG_LABELS[tag] ?? tag))];
  if (product.openSource) labels.push("Open source");
  return labels.slice(0, 3).map((label) => ({
    label,
    tone: label === "Open source" ? "outline" : "secondary",
  }));
}

export function toProductSummary(
  product: CatalogProduct,
  companies: ReadonlyMap<string, CatalogCompany>,
): ProductSummary {
  const company = product.companySlug ? companies.get(product.companySlug) : undefined;
  const lastSourceCheck = company?.sources
    .map((source) => source.checkedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return {
    slug: product.slug,
    name: product.name,
    href: `/tools/${product.slug}`,
    summary: product.summary,
    companyName: company?.name,
    companyHref: company ? `/companies/${company.slug}` : undefined,
    logoSrc: product.logo,
    screenshotSrc: product.screenshot,
    screenshotAlt: `${product.name} product interface`,
    badges: productBadges(product),
    lastReviewedLabel: lastSourceCheck,
  };
}

export function toObservabilitySummary(product: ObservabilityProduct): ProductSummary {
  const badges: ProductBadge[] = [
    { label: product.type, tone: "secondary" },
    { label: product.openSourceStatus, tone: "outline" },
    ...product.signals.slice(0, 1).map((label) => ({
      label,
      tone: "secondary" as const,
    })),
  ];
  return {
    slug: observabilityWorkflowSlug(product.slug),
    name: product.name,
    href: `/observability/${product.slug}`,
    summary: product.summary,
    logoSrc: product.logo,
    screenshotSrc: product.screenshot,
    screenshotAlt: `${product.name} observability interface`,
    badges,
    lastReviewedLabel: product.lastReviewed,
  };
}

export function observabilityWorkflowSlug(routeSlug: string) {
  return `obs-${routeSlug}`;
}

export function productFacts(product: CatalogProduct): ProductFact[] {
  return [
    { label: "Category", value: product.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", ") },
    { label: "Deployment", value: product.deployment.join(", ") },
    { label: "Open source", value: product.openSource ? "Yes" : "No" },
    { label: "Pricing", value: "Unknown", detail: "No reviewed pricing source is attached yet." },
    { label: "Evidence review", value: "Pending", detail: "Unsourced fields remain explicitly unknown." },
    { label: "Added to Watchlist", value: product.dateAdded },
  ];
}

/**
 * Returns only destinations explicitly present in the reviewed catalog entry.
 * Missing social accounts stay missing rather than being inferred from a
 * product name or website domain.
 */
export function productResourceLinks(product: CatalogProduct): ProductResourceLink[] {
  const links: ProductResourceLink[] = [
    {
      kind: "website",
      label: PRODUCT_RESOURCE_LABELS.website,
      href: product.url,
    },
  ];
  const socialLinks: readonly [
    kind: Exclude<ProductResourceKind, "website">,
    href: string | undefined,
  ][] = [
    ["linkedin", product.socialLinks.linkedin],
    ["x", product.socialLinks.x],
    ["github", product.socialLinks.github],
    ["producthunt", product.socialLinks.producthunt],
  ];

  for (const [kind, href] of socialLinks) {
    if (!href) continue;
    links.push({ kind, label: PRODUCT_RESOURCE_LABELS[kind], href });
  }

  return links;
}

export function observabilityResourceLinks(
  product: ObservabilityProduct,
): ProductResourceLink[] {
  return [
    {
      kind: "website",
      label: PRODUCT_RESOURCE_LABELS.website,
      href: product.url,
    },
    ...(product.links.docs
      ? [{
          kind: "documentation" as const,
          label: PRODUCT_RESOURCE_LABELS.documentation,
          href: product.links.docs,
        }]
      : []),
    ...(product.links.github
      ? [{
          kind: "github" as const,
          label: PRODUCT_RESOURCE_LABELS.github,
          href: product.links.github,
        }]
      : []),
    ...(product.links.community
      ? [{
          kind: "community" as const,
          label: PRODUCT_RESOURCE_LABELS.community,
          href: product.links.community,
        }]
      : []),
  ];
}

export function observabilityFacts(product: ObservabilityProduct): ProductFact[] {
  return [
    { label: "Type", value: product.type },
    { label: "Open source", value: product.openSourceStatus },
    { label: "Signals", value: product.signals.length ? product.signals.join(", ") : "Unknown" },
    { label: "Deployment", value: product.deployment.length ? product.deployment.join(", ") : "Unknown" },
    { label: "Ecosystem", value: product.ecosystem.length ? product.ecosystem.join(", ") : "Unknown" },
    { label: "Last reviewed", value: product.lastReviewed },
  ];
}

export function companySources(company: CatalogCompany): SourceReference[] {
  return company.sources.map((source, index) => ({
    id: `${company.slug}-${index}`,
    title: source.label,
    publisher: company.name,
    href: source.url,
    sourceType: "First-party source",
    accessedAtLabel: source.checkedAt,
  }));
}

export function productEvidenceClaims(
  product: CatalogProduct,
  company?: CatalogCompany,
): EvidenceClaim[] {
  const isWaveOne = getEarlyCohort().entries.some(
    (entry) => entry.wave === 1 && entry.productSlug === product.slug,
  );
  const source = company?.sources[0];

  if (!isWaveOne || !source || product.features.length === 0) return [];

  return product.features.map((feature, index) => ({
    id: `${product.slug}-documented-${index + 1}`,
    claim: feature,
    detail: `Documented in ${source.label}. This confirms a first-party source for the capability; it is not independent performance testing.`,
    status: "documented",
    sourceCount: 1,
    lastCheckedLabel: source.checkedAt,
    sourceHref: source.url,
  }));
}

export function observabilityEvidenceClaims(
  product: ObservabilityProduct,
): EvidenceClaim[] {
  return product.useCases.slice(0, 3).map((useCase, index) => ({
    id: `${product.slug}-vendor-claim-${index + 1}`,
    claim: useCase,
    detail:
      "Structured from the product's public materials. The Watchlist has not independently tested this outcome.",
    status: "vendor-claimed",
    sourceCount: 1,
    lastCheckedLabel: product.lastReviewed,
    sourceHref: product.url,
  }));
}

export function displayCategoryForProduct(product: CatalogProduct): string {
  if (product.openSource) return "oss";
  const labels = product.tags.map((tag) => TAG_LABELS[tag] ?? tag);
  return labels[0]?.toLowerCase().replaceAll(" ", "-") ?? "other";
}

export function getAllProductSummaryMap() {
  const companies = companyMap(getCompanies());
  return new Map([
    ...getProducts().map((product) => [product.slug, toProductSummary(product, companies)] as const),
    ...getObservabilityProducts().map(
      (product) => [product.slug, toObservabilitySummary(product)] as const,
    ),
  ]);
}
