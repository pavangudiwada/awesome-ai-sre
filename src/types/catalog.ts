export const PRODUCT_TAGS = [
  "Incident Response",
  "Observability",
  "AIOps",
  "IDP",
  "IaC",
  "FinOps",
  "Security",
  "Deployment",
] as const;

export const PRODUCT_DEPLOYMENTS = ["saas", "on-prem", "hybrid"] as const;

export const CONTENT_STATUSES = ["draft", "published"] as const;
export const CONTENT_KINDS = ["comparison", "resource", "blog", "update"] as const;

export type ProductTag = (typeof PRODUCT_TAGS)[number];
export type ProductDeployment = (typeof PRODUCT_DEPLOYMENTS)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const PRODUCT_RESOURCE_KINDS = [
  "website",
  "linkedin",
  "x",
  "github",
  "producthunt",
  "documentation",
  "community",
] as const;

export type ProductResourceKind = (typeof PRODUCT_RESOURCE_KINDS)[number];

export interface SocialLinks {
  readonly linkedin?: string;
  readonly github?: string;
  readonly x?: string;
  readonly producthunt?: string;
}

/**
 * An editorially supplied product destination ready for presentation. The
 * catalog's existing `url` and `socialLinks` fields remain the source of truth;
 * this descriptor only gives consumers a stable order and vocabulary.
 */
export interface ProductResourceLink {
  readonly kind: ProductResourceKind;
  readonly label: string;
  readonly href: string;
}

/**
 * A normalized product from tools/operate. `claimed` is intentionally omitted:
 * the legacy field is not evidence that a product or company has been verified.
 */
export interface CatalogProduct {
  readonly catalogFamily: "ai-sre";
  readonly name: string;
  readonly slug: string;
  readonly companySlug: string | null;
  readonly url: string;
  readonly summary: string;
  readonly deployment: readonly ProductDeployment[];
  readonly openSource: boolean;
  readonly tags: readonly ProductTag[];
  readonly dateAdded: string;
  readonly screenshot?: string;
  readonly logo?: string;
  readonly screenshotLastFetched?: string;
  readonly features: readonly string[];
  readonly socialLinks: SocialLinks;
  readonly editorialState: "unreviewed";
  readonly lastReviewed: null;
  readonly sourceFile: string;
}

export interface ObservabilityLinks {
  readonly docs?: string;
  readonly github?: string;
  readonly community?: string;
}

export interface ObservabilityProduct {
  readonly catalogFamily: "observability";
  readonly name: string;
  readonly slug: string;
  readonly companySlug: null;
  readonly url: string;
  readonly summary: string;
  readonly screenshot?: string;
  readonly logo?: string;
  readonly type: string;
  readonly openSourceStatus: "Open source" | "Commercial" | "Mixed";
  readonly signals: readonly string[];
  readonly layers: readonly string[];
  readonly ecosystem: readonly string[];
  readonly deployment: readonly string[];
  readonly useCases: readonly string[];
  readonly links: ObservabilityLinks;
  readonly lastReviewed: string;
  readonly sourceFile: string;
}

export interface CompanySource {
  readonly label: string;
  readonly url: string;
  readonly checkedAt?: string;
}

export interface CatalogCompany {
  readonly name: string;
  readonly slug: string;
  readonly website: string;
  readonly productSlugs: readonly string[];
  readonly mappingStatus: "confirmed" | "needs-review";
  readonly sources: readonly CompanySource[];
  readonly sourceFile: string;
}

export interface CohortEntry {
  readonly priority: number;
  readonly wave: 1 | 2 | 3;
  readonly targetName: string;
  readonly productSlug: string;
  readonly companySlug: string;
  readonly researchState:
    | "source-ready"
    | "needs-product-record"
    | "needs-product-scope-review";
}

export interface EarlyCohort {
  readonly name: string;
  readonly slug: "early-18";
  readonly status: "active";
  readonly entries: readonly CohortEntry[];
  readonly sourceFile: string;
}

export interface BaseContentMetadata {
  readonly kind: ContentKind;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly status: ContentStatus;
  readonly authors: readonly string[];
  readonly tags: readonly string[];
  readonly publishedAt?: string;
  readonly updatedAt?: string;
}

export interface ComparisonMetadata extends BaseContentMetadata {
  readonly kind: "comparison";
  readonly audience: string;
  readonly question: string;
  readonly productSlugs: readonly string[];
  readonly methodologyVersion: string;
}

export interface ResourceMetadata extends BaseContentMetadata {
  readonly kind: "resource";
  readonly resourceType: "guide" | "report" | "checklist" | "scorecard";
}

export interface BlogMetadata extends BaseContentMetadata {
  readonly kind: "blog";
  readonly excerpt: string;
}

export interface UpdateMetadata extends BaseContentMetadata {
  readonly kind: "update";
  readonly updateType: "product-change" | "watchlist" | "methodology";
  readonly companySlugs: readonly string[];
  readonly productSlugs: readonly string[];
  readonly sourceUrls: readonly string[];
  readonly occurredAt?: string;
}

export type ContentMetadata =
  | ComparisonMetadata
  | ResourceMetadata
  | BlogMetadata
  | UpdateMetadata;

export interface ContentDocument<TMetadata extends ContentMetadata = ContentMetadata> {
  readonly metadata: TMetadata;
  readonly body: string;
  readonly sourceFile: string;
}

export type ValidationSeverity = "error" | "warning";

export interface CatalogValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly sourceFile: string;
  readonly message: string;
}

export interface CatalogValidationReport {
  readonly valid: boolean;
  readonly counts: {
    readonly products: number;
    readonly observabilityProducts: number;
    readonly companies: number;
    readonly cohortEntries: number;
    readonly contentDocuments: number;
  };
  readonly issues: readonly CatalogValidationIssue[];
}
