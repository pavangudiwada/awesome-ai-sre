import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const newsDateSchema = z.iso.date();
export const newsSourceUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Public news sources must be HTTPS URLs without credentials");

export const reviewedNewsSchema = z.object({
  slug: slugSchema,
  company: z.string().min(1),
  companySlug: slugSchema.nullable().optional(),
  product: z.string().min(1),
  category: z.enum([
    "Funding", "Funding and launch", "Launch", "Product update",
    "General availability", "Preview", "Access change",
  ]),
  title: z.string().min(1),
  summary: z.string().min(1),
  announcedAt: newsDateSchema,
  eventDate: newsDateSchema.nullable(),
  dateNote: z.string().min(1),
  availability: z.string().min(1),
  sources: z.array(z.object({
    label: z.string().min(1),
    url: newsSourceUrlSchema,
    scope: z.enum(["event", "timeline"]).default("event"),
  }).strict()).min(1),
  reviewed: z.literal(true),
  reviewedAt: newsDateSchema,
}).strict().refine((record) => record.reviewedAt >= record.announcedAt, {
  message: "Review date cannot precede the source announcement",
});

export type ReviewedNews = z.infer<typeof reviewedNewsSchema>;

export const reviewedNewsCollectionSchema = z.array(reviewedNewsSchema).superRefine((records, context) => {
  const slugs = new Set<string>();
  for (const [index, record] of records.entries()) {
    if (slugs.has(record.slug)) {
      context.addIssue({ code: "custom", path: [index, "slug"], message: "News slugs must be unique" });
    }
    slugs.add(record.slug);
  }
});

// Select only public publication fields. Unknown columns are never forwarded.
export const publishedNewsRowSchema = z.object({
  id: z.string().uuid(),
  company_slug: slugSchema.nullable().optional(),
  slug: slugSchema,
  title: z.string().min(1),
  summary: z.string(),
  source_url: newsSourceUrlSchema.nullable(),
  content_path: z.string().regex(/^\/updates\/[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
  published_at: z.iso.datetime({ offset: true }),
});
export type PublishedNewsRow = z.infer<typeof publishedNewsRowSchema>;
