import { describe, expect, it } from "vitest";

import { productBadges, productFacts } from "../presentation/catalog";

import { getCompanyBySlug } from "./companies";
import { collectProductSources, getProductBySlug, getProducts, productIdentityMappingIssues } from "./products";

describe("independently sourced external product suggestions", () => {
  it.each(["anyshift", "emisar"])("maps %s once without implying verification", (slug) => {
    const matches = getProducts().filter((product) => product.slug === slug);
    const product = getProductBySlug(slug);
    const company = getCompanyBySlug(slug);

    expect(matches).toHaveLength(1);
    expect(product?.companySlug).toBe(slug);
    expect(product?.openSource).toBe(false);
    expect(product?.editorialState).toBe("unreviewed");
    expect(product?.lastReviewed).toBeNull();
    expect(product?.screenshot).toBe(`/screenshots/${slug}.jpg`);
    expect(company?.productSlugs).toEqual([slug]);
    expect(company?.mappingStatus).toBe("confirmed");
    expect(company?.sources.length).toBeGreaterThanOrEqual(3);
    expect(company?.sources.every((source) => source.checkedAt === "2026-10-15")).toBe(true);
  });

  it("keeps commercial and hosted deployment boundaries explicit", () => {
    const anyshift = getProductBySlug("anyshift");
    const emisar = getProductBySlug("emisar");

    expect(anyshift?.deployment).toEqual(["saas"]);
    expect(anyshift?.tags[0]).toBe("Incident Response");
    expect(emisar?.deployment).toEqual(["hybrid"]);
    expect(emisar?.tags[0]).toBe("Security");
    expect(emisar?.summary).toContain("hosted control plane");
    expect(productBadges(emisar!).map((badge) => badge.label)).toEqual(["Security", "Deployment"]);
    expect(productFacts(emisar!).find((fact) => fact.label === "Category")?.value).toBe("Security, Deployment");
    expect(getCompanyBySlug("emisar")?.sources.some((source) =>
      source.url === "https://github.com/AndrewDryga/emisar/blob/main/LICENSE.md",
    )).toBe(true);
  });

  it.each(["ingero", "k8sgpt", "kagent", "kubestellar-console", "sre-bench", "opensre-in"])(
    "retains source-backed project identity for %s without creating a company mapping",
    (slug) => {
      const product = getProductBySlug(slug);
      expect(product?.companySlug).toBeNull();
      expect(product?.projectIdentity?.name).toBeTruthy();
      expect(product?.projectIdentity?.limitations).toBeTruthy();
      expect(product?.projectIdentity?.sources.length).toBeGreaterThan(0);
      expect(product?.projectIdentity?.sources.every((source) => source.checkedAt === "2026-10-24")).toBe(true);
    },
  );

  it("rejects simultaneous project identity and company mapping", () => {
    const source = collectProductSources().products.find((product) => product.value.slug === "ingero")!;
    const issues = productIdentityMappingIssues([source], new Map([["ingero", "ingero"]]));
    expect(issues).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "product_identity_mapping_conflict",
        recordId: "ingero",
      }),
    ]);
  });
});
