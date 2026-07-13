import { z } from "zod";

import {
  CONTENT_STATUSES,
  PRODUCT_DEPLOYMENTS,
  PRODUCT_TAGS,
  type CatalogCompany,
  type CohortEntry,
} from "../../types/catalog";

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase kebab-case slug");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must use YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "must be a valid date");

const httpUrlSchema = z.string().url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  "must use http or https",
);

const assetPathSchema = z.string().regex(/^\/(?:logos|screenshots)\/[A-Za-z0-9._/-]+$/);
const nonEmptyStringArray = z.array(z.string().trim().min(1));

export const legacyProductSourceSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: slugSchema,
    url: httpUrlSchema,
    summary: z.string().trim().min(1),
    deployment: z.array(z.enum(PRODUCT_DEPLOYMENTS)).min(1),
    opensource: z.boolean(),
    tags: z.array(z.enum(PRODUCT_TAGS)).min(1),
    dateAdded: dateSchema,
    claimed: z.boolean().optional(),
    screenshot: assetPathSchema.optional(),
    logo: assetPathSchema.optional(),
    screenshot_last_fetched: dateSchema.optional(),
    features: nonEmptyStringArray.max(3).optional(),
    linkedin: httpUrlSchema.optional(),
    github: httpUrlSchema.optional(),
    x: httpUrlSchema.optional(),
    producthunt: httpUrlSchema.optional(),
  })
  .strict();

export type LegacyProductSource = z.infer<typeof legacyProductSourceSchema>;

export const observabilityProductSourceSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: slugSchema,
    screenshot: assetPathSchema.optional(),
    logo: assetPathSchema.optional(),
    url: httpUrlSchema,
    summary: z.string().trim().min(1),
    type: z.string().trim().min(1),
    ossStatus: z.enum(["Open source", "Commercial", "Mixed"]),
    signals: nonEmptyStringArray,
    layers: nonEmptyStringArray,
    ecosystem: nonEmptyStringArray,
    deployment: nonEmptyStringArray,
    useCases: nonEmptyStringArray,
    links: z
      .object({
        docs: httpUrlSchema.optional(),
        github: httpUrlSchema.optional(),
        community: httpUrlSchema.optional(),
      })
      .strict(),
    lastReviewed: dateSchema,
  })
  .strict();

export type ObservabilityProductSource = z.infer<typeof observabilityProductSourceSchema>;

export const companySourceSchema = z
  .object({
    label: z.string().trim().min(1),
    url: httpUrlSchema,
    checkedAt: dateSchema.optional(),
  })
  .strict();

export const companySchema: z.ZodType<Omit<CatalogCompany, "sourceFile">> = z
  .object({
    name: z.string().trim().min(1),
    slug: slugSchema,
    website: httpUrlSchema,
    productSlugs: z.array(slugSchema).min(1),
    mappingStatus: z.enum(["confirmed", "needs-review"]),
    sources: z.array(companySourceSchema).min(1),
  })
  .strict();

export const cohortEntrySchema: z.ZodType<CohortEntry> = z
  .object({
    priority: z.number().int().positive(),
    wave: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    targetName: z.string().trim().min(1),
    productSlug: slugSchema,
    companySlug: slugSchema,
    researchState: z.enum([
      "source-ready",
      "needs-product-record",
      "needs-product-scope-review",
    ]),
  })
  .strict();

export const earlyCohortSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: z.literal("early-18"),
    status: z.literal("active"),
    entries: z.array(cohortEntrySchema).length(18),
  })
  .strict();

const baseContentShape = {
  title: z.string().trim().min(1),
  slug: slugSchema,
  description: z.string().trim().min(1),
  status: z.enum(CONTENT_STATUSES),
  authors: nonEmptyStringArray.min(1),
  tags: nonEmptyStringArray,
  publishedAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
};

function requirePublishedDate(
  value: { readonly status: string; readonly publishedAt?: string },
  context: z.RefinementCtx,
): void {
  if (value.status === "published" && !value.publishedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["publishedAt"],
      message: "published content requires publishedAt",
    });
  }
}

export const comparisonMetadataSchema = z
  .object({
    ...baseContentShape,
    kind: z.literal("comparison"),
    audience: z.string().trim().min(1),
    question: z.string().trim().min(1),
    productSlugs: z.array(slugSchema).min(2),
    methodologyVersion: z.string().trim().min(1),
  })
  .strict()
  .superRefine(requirePublishedDate);

export const resourceMetadataSchema = z
  .object({
    ...baseContentShape,
    kind: z.literal("resource"),
    resourceType: z.enum(["guide", "report", "checklist", "scorecard"]),
  })
  .strict()
  .superRefine(requirePublishedDate);

export const blogMetadataSchema = z
  .object({
    ...baseContentShape,
    kind: z.literal("blog"),
    excerpt: z.string().trim().min(1),
  })
  .strict()
  .superRefine(requirePublishedDate);

export const updateMetadataSchema = z
  .object({
    ...baseContentShape,
    kind: z.literal("update"),
    updateType: z.enum(["product-change", "watchlist", "methodology"]),
    companySlugs: z.array(slugSchema),
    productSlugs: z.array(slugSchema),
    sourceUrls: z.array(httpUrlSchema),
    occurredAt: dateSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    requirePublishedDate(value, context);
    if (value.status === "published" && value.sourceUrls.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceUrls"],
        message: "published updates require at least one source URL",
      });
    }
  });

export const contentMetadataSchema = z.discriminatedUnion("kind", [
  comparisonMetadataSchema,
  resourceMetadataSchema,
  blogMetadataSchema,
  updateMetadataSchema,
]);

export { assetPathSchema, dateSchema, httpUrlSchema, slugSchema };
