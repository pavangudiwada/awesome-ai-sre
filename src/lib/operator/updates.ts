import { z } from "zod";

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalSlugSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  slugSchema.optional(),
);

export const operatorUpdateInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(2_000),
  sourceUrl: z.string().trim().url().max(2_000).refine(
    (value) => new URL(value).protocol === "https:",
    "Source URL must use HTTPS",
  ),
  companySlug: optionalSlugSchema,
  productSlug: optionalSlugSchema,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

export { slugSchema };
