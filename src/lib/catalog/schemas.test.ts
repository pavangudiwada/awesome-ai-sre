import { describe, expect, it } from "vitest";

import {
  blogMetadataSchema,
  comparisonMetadataSchema,
  legacyProductSourceSchema,
  resourceMetadataSchema,
} from "./schemas";

const basePublishedMetadata = {
  title: "A substantive document",
  slug: "a-substantive-document",
  description: "A complete description for a public document.",
  status: "published" as const,
  authors: ["AI SRE Watchlist"],
  tags: ["research"],
  publishedAt: "2026-07-17",
};

describe("content publication metadata", () => {
  it.each([
    [
      "comparison",
      comparisonMetadataSchema,
      {
        ...basePublishedMetadata,
        kind: "comparison" as const,
        audience: "SRE teams",
        question: "Which workflow fits?",
        productSlugs: ["runwhen", "holmesgpt"],
        methodologyVersion: "1.0",
      },
    ],
    [
      "blog",
      blogMetadataSchema,
      {
        ...basePublishedMetadata,
        kind: "blog" as const,
        excerpt: "A public excerpt.",
      },
    ],
  ])("rejects published %s metadata while its public route is absent", (_kind, schema, metadata) => {
    const result = schema.safeParse(metadata);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["status"],
            message: expect.stringContaining("substantive public route"),
          }),
        ]),
      );
    }
  });

  it("allows a published resource because its detail route exists", () => {
    expect(
      resourceMetadataSchema.safeParse({
        ...basePublishedMetadata,
        kind: "resource",
        resourceType: "guide",
      }).success,
    ).toBe(true);
  });
});

describe("project identity schema", () => {
  const product = {
    name: "Example project",
    slug: "example-project",
    url: "https://example.com",
    summary: "An example project for infrastructure operations.",
    deployment: ["on-prem"],
    opensource: true,
    tags: ["Incident Response"],
    dateAdded: "2026-10-24",
    projectIdentity: {
      name: "Example project",
      website: "https://example.com",
      limitations: "The source does not identify a legal operating company.",
      sources: [{ label: "Official project site", url: "https://example.com", checkedAt: "2026-10-24" }],
    },
  };

  it("requires nonempty identity sources with a checked date", () => {
    expect(legacyProductSourceSchema.safeParse(product).success).toBe(true);
    expect(legacyProductSourceSchema.safeParse({ ...product, projectIdentity: { ...product.projectIdentity, sources: [] } }).success).toBe(false);
    expect(legacyProductSourceSchema.safeParse({ ...product, projectIdentity: { ...product.projectIdentity, sources: [{ label: "Official project site", url: "https://example.com" }] } }).success).toBe(false);
  });
});
