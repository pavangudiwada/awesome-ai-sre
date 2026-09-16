import { describe, expect, it } from "vitest";

import {
  buildLinkedCatalogPrepareSql,
  buildLinkedCatalogSyncSql,
  compareCatalogReferenceCompatibility,
  compareCatalogReferenceParity,
  formatCatalogReferenceParity,
  type CatalogSyncPlan,
} from "./sync-catalog-refs";

const plan: CatalogSyncPlan = {
  companies: [
    {
      slug: "example-company",
      name: "Example Company",
      website_domain: "example.com",
    },
  ],
  products: [
    {
      slug: "example-product",
      name: "Example Product",
      url: "https://example.com/product",
      company_slug: "example-company",
      yaml_hash: "a".repeat(64),
    },
  ],
};

describe("catalog reference parity", () => {
  it("accepts exact active slug and source-hash parity", () => {
    expect(
      compareCatalogReferenceParity(plan, {
        companySlugs: ["example-company"],
        products: [
          { slug: "example-product", yamlHash: "a".repeat(64) },
        ],
      }),
    ).toEqual({
      matches: true,
      missingCompanySlugs: [],
      unexpectedCompanySlugs: [],
      missingProductSlugs: [],
      unexpectedProductSlugs: [],
      staleProductSlugs: [],
    });
  });

  it("reports missing, unexpected, and stale active references", () => {
    const parity = compareCatalogReferenceParity(plan, {
      companySlugs: ["old-company"],
      products: [
        { slug: "example-product", yamlHash: "b".repeat(64) },
        { slug: "old-product", yamlHash: null },
      ],
    });

    expect(parity).toMatchObject({
      matches: false,
      missingCompanySlugs: ["example-company"],
      unexpectedCompanySlugs: ["old-company"],
      missingProductSlugs: [],
      unexpectedProductSlugs: ["old-product"],
      staleProductSlugs: ["example-product"],
    });
    expect(formatCatalogReferenceParity(parity)).toContain(
      "stale product hashes: example-product",
    );
  });

  it("keeps linked sync and parity checks in one transaction", () => {
    const sql = buildLinkedCatalogSyncSql(plan.companies, plan.products);

    expect(sql).toContain("begin;");
    expect(sql).toContain("do $catalog_parity$");
    expect(sql).toContain("raise exception 'Active catalog product references");
    expect(sql.indexOf("raise exception")).toBeLessThan(
      sql.indexOf("commit;"),
    );
  });

  it("treats additive old references as compatible before traffic promotion", () => {
    expect(
      compareCatalogReferenceCompatibility(plan, {
        companySlugs: ["example-company", "old-company"],
        products: [
          { slug: "example-product", yamlHash: "a".repeat(64) },
          { slug: "old-product", yamlHash: "b".repeat(64) },
        ],
      }),
    ).toEqual({
      matches: true,
      missingCompanySlugs: [],
      missingProductSlugs: [],
      staleProductSlugs: [],
    });
  });

  it("prepares an additive compatible catalog without deactivating old refs", () => {
    const sql = buildLinkedCatalogPrepareSql(plan.companies, plan.products);

    expect(sql).toContain("begin;");
    expect(sql).toContain("do $catalog_compatibility$");
    expect(sql).not.toContain("set is_active = false");
    expect(sql.indexOf("raise exception")).toBeLessThan(sql.indexOf("commit;"));
  });
});
