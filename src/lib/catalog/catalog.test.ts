import { describe, expect, it } from "vitest";

import { getEarlyCohort } from "./cohort";
import { getCompanies } from "./companies";
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
    const unmappedProduct = getProductBySlug("ingero");

    expect(products).toHaveLength(81);
    expect(holmes?.companySlug).toBe("robusta");
    expect(holmes?.editorialState).toBe("unreviewed");
    expect(holmes?.lastReviewed).toBeNull();
    expect(holmes).not.toHaveProperty("claimed");
    expect(unmappedProduct?.companySlug).toBeNull();
  });

  it("keeps sourced vendor mappings unique and separate from capability verification", () => {
    const companies = getCompanies();
    const mappings = companies.flatMap((company) => company.productSlugs);
    expect(new Set(mappings).size).toBe(mappings.length);
    expect(getProductBySlug("deductive-ai")?.companySlug).toBe("elastic");
    expect(getProductBySlug("elastic")?.companySlug).toBe("elastic");
    expect(getProductBySlug("aurora")?.companySlug).toBe("arvo-ai");
    expect(getProductBySlug("lens-k8s-ide")?.companySlug).toBe("mirantis");
    expect(getProductBySlug("phoebe")?.companySlug).toBe("phoebe-technology");
    expect(getProductBySlug("observe-inc")?.companySlug).toBe("snowflake");
    expect(getProductBySlug("vigiles")?.companySlug).toBe("vigiles");
    expect(getProducts().filter((product) => product.companySlug === null).map((product) => product.slug).sort()).toEqual([
      "ingero", "k8sgpt", "kagent", "kubestellar-console", "sre-bench",
    ]);
    for (const slug of ["alertd", "aurora", "deductive-ai", "phoebe", "runllm", "stakpak"]) {
      const product = getProductBySlug(slug);
      expect(product?.editorialState).toBe("unreviewed");
      expect(product?.lastReviewed).toBeNull();
      expect(product).not.toHaveProperty("claimed");
    }
  });

  it("keeps the OpenObserve Enterprise preview separate from platform open source status", () => {
    const product = getProductBySlug("openobserve-ai-sre");
    expect(product?.companySlug).toBe("openobserve");
    expect(product?.openSource).toBe(false);
    expect(product?.summary).toContain("Preview");
    expect(product?.summary).toContain("Enterprise license");
    expect(product?.editorialState).toBe("unreviewed");
  });

  it("preserves ilert's GA autonomy boundary and former product name", () => {
    const product = getProductBySlug("ilert-ai-sre");
    expect(product?.companySlug).toBe("ilert");
    expect(product?.summary).toContain("formerly ilert Responder");
    expect(product?.summary).toContain("paid plans and trials");
    expect(product?.summary).toContain("action execution left to the engineer");
    expect(product?.deployment).toEqual(["saas"]);
    expect(product?.openSource).toBe(false);
    expect(product?.editorialState).toBe("unreviewed");
  });

  it("keeps empirik's change-risk scope and VPC qualification explicit", () => {
    const product = getProductBySlug("empirik");
    expect(product?.companySlug).toBe("empirik");
    expect(product?.summary).toContain("change review and incident prevention");
    expect(product?.summary).toContain("customer-managed VPC");
    expect(product?.tags).toEqual(["AIOps"]);
    expect(product?.deployment).toEqual(["saas"]);
    expect(product?.openSource).toBe(false);
    expect(product?.editorialState).toBe("unreviewed");
    expect(product?.lastReviewed).toBeNull();
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
    expect(missingRecords).toEqual([]);
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
    expect(missingCohortProducts).toEqual([]);
  });
});
