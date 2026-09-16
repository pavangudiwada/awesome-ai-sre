import { z } from "zod";

import { catalogSlugSchema } from "@/lib/auth/schemas";

export const evaluationDecisionSchema = z.enum([
  "undecided",
  "advance",
  "hold",
  "reject",
]);

export const productNoteBodySchema = z.string().trim().max(20_000);

/**
 * Form controls use "none" as their display value for an optional catalog
 * subject. Convert that sentinel at the request boundary so it is never
 * mistaken for a real catalog slug.
 */
export function parseOptionalCatalogSlug(value: unknown) {
  return value === null || value === "" || value === "none" ? undefined : value;
}

export const evaluationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().trim().max(4_000).default(""),
  requirements: z.string().trim().max(8_000).default(""),
  risks: z.string().trim().max(8_000).default(""),
  decision: evaluationDecisionSchema.default("undecided"),
  productSlug: catalogSlugSchema.optional(),
});

export const practitionerProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120),
  organization: z.string().trim().max(160),
});

export const editorialSubmissionSchema = z
  .object({
    submissionType: z.enum(["correction", "company_update"]),
    relationship: z.enum([
      "practitioner",
      "company_employee",
      "founder",
      "agency",
      "other",
    ]),
    productSlug: catalogSlugSchema.optional(),
    companySlug: catalogSlugSchema.optional(),
    sourceUrl: z
      .string()
      .url()
      .max(2_000)
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        {
          message: "Use an HTTP or HTTPS source URL",
        },
      ),
    message: z.string().trim().min(20).max(10_000),
    contactEmail: z.string().trim().toLowerCase().email().max(320),
    website: z.string().max(0).optional(),
    turnstileToken: z.string().min(1).max(2_048),
  })
  .refine((value) => value.productSlug || value.companySlug, {
    message: "Choose a product or company",
  });
