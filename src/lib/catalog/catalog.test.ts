import { describe, expect, it } from "vitest";

import { getEarlyCohort } from "./cohort";
import {
  getAllContentDocuments,
  getAnyContentDocument,
  getContentDocuments,
  getPublishedContentDocuments,
  getResources,
  getUpdates,
} from "./content";
import { getObservabilityProducts } from "./observability";
import { getProductBySlug, getProducts } from "./products";
import { validateCatalog } from "./validation";

describe("catalog loaders", () => {
  it("normalizes all legacy products without turning claimed into verification", () => {
    const products = getProducts();
    const holmes = getProductBySlug("holmesgpt");
    const unmappedProduct = getProductBySlug("agent-sre");

    expect(products).toHaveLength(77);
    expect(holmes?.companySlug).toBe("robusta");
    expect(holmes?.editorialState).toBe("unreviewed");
    expect(holmes?.lastReviewed).toBeNull();
    expect(holmes).not.toHaveProperty("claimed");
    expect(unmappedProduct?.companySlug).toBeNull();
  });

  it("preserves editorially supplied product social destinations", () => {
    const product = getProductBySlug("better-stack");

    expect(product?.socialLinks).toEqual({
      linkedin: "https://www.linkedin.com/company/betterstack",
      github: "https://github.com/BetterStackHQ",
      x: "https://x.com/betterstackhq",
    });
  });

  it("validates and loads observability data as a separate catalog family", () => {
    const products = getObservabilityProducts();

    expect(products).toHaveLength(34);
    expect(products.every((product) => product.catalogFamily === "observability")).toBe(true);
    expect(products.every((product) => product.companySlug === null)).toBe(true);
  });

  it("keeps the early cohort ordered and makes missing source records explicit", () => {
    const cohort = getEarlyCohort();
    const missingRecords = cohort.entries.filter(
      (entry) => entry.researchState === "needs-product-record",
    );

    expect(cohort.entries).toHaveLength(18);
    expect(cohort.entries.map((entry) => entry.priority)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(missingRecords.map((entry) => entry.productSlug)).toEqual([
      "openobserve-ai-sre",
    ]);
  });

  it("publishes only the completed practitioner resources", () => {
    const documents = getAllContentDocuments();
    const draftKinds = documents
      .filter((document) => document.metadata.status === "draft")
      .map((document) => document.metadata.kind);

    expect(documents).toHaveLength(11);
    expect(getPublishedContentDocuments()).toHaveLength(6);
    expect(getContentDocuments()).toHaveLength(6);
    expect(getResources()).toHaveLength(6);
    expect(draftKinds).toEqual(["comparison", "comparison", "comparison", "update", "blog"]);
    expect(getUpdates()).toEqual([]);
    expect(getAnyContentDocument("update", "watchlist-weekly-digest-001")?.body).toContain(
      "not a real update",
    );
  });

  it("reports current catalog gaps deterministically without schema errors", () => {
    const report = validateCatalog();
    const missingCohortProducts = report.issues
      .filter((issue) => issue.code === "cohort_product_missing")
      .map((issue) => issue.message);

    expect(report.valid).toBe(true);
    expect(report.issues.some((issue) => issue.severity === "error")).toBe(false);
    expect(missingCohortProducts).toEqual([
      'priority 11 requires a product record for "openobserve-ai-sre"',
    ]);
  });
});
