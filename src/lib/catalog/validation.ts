import { existsSync } from "node:fs";

import type {
  CatalogValidationIssue,
  CatalogValidationReport,
  ContentDocument,
} from "../../types/catalog";
import { collectCompanies } from "./companies";
import { collectContentDocuments } from "./content";
import { collectEarlyCohort } from "./cohort";
import { collectObservabilityProducts } from "./observability";
import { fromRepoRoot } from "./paths";
import { collectProductSources } from "./products";

function pushDuplicates(
  values: readonly { readonly slug: string; readonly sourceFile: string }[],
  kind: string,
  issues: CatalogValidationIssue[],
): void {
  const firstSourceBySlug = new Map<string, string>();
  for (const value of values) {
    const firstSource = firstSourceBySlug.get(value.slug);
    if (firstSource) {
      issues.push({
        severity: "error",
        code: `duplicate_${kind}_slug`,
        sourceFile: value.sourceFile,
        message: `slug "${value.slug}" is also defined in ${firstSource}`,
      });
      continue;
    }
    firstSourceBySlug.set(value.slug, value.sourceFile);
  }
}

function validateAsset(
  assetPath: string | undefined,
  sourceFile: string,
  ownerSlug: string,
  issues: CatalogValidationIssue[],
): void {
  if (!assetPath) {
    issues.push({
      severity: "warning",
      code: "missing_asset_reference",
      sourceFile,
      message: `"${ownerSlug}" has no asset path`,
    });
    return;
  }

  if (!existsSync(fromRepoRoot("public", assetPath.slice(1)))) {
    issues.push({
      severity: "warning",
      code: "missing_asset_file",
      sourceFile,
      message: `"${ownerSlug}" references missing public asset ${assetPath}`,
    });
  }
}

function validateContentReferences(
  documents: readonly ContentDocument[],
  productSlugs: ReadonlySet<string>,
  companySlugs: ReadonlySet<string>,
  issues: CatalogValidationIssue[],
): void {
  for (const document of documents) {
    const severity = document.metadata.status === "published" ? "error" : "warning";
    const referencedProductSlugs =
      document.metadata.kind === "comparison" || document.metadata.kind === "update"
        ? document.metadata.productSlugs
        : [];

    for (const productSlug of referencedProductSlugs) {
      if (!productSlugs.has(productSlug)) {
        issues.push({
          severity,
          code: "content_product_missing",
          sourceFile: document.sourceFile,
          message: `references product "${productSlug}", which is not in tools/operate`,
        });
      }
    }

    if (document.metadata.kind === "update") {
      for (const companySlug of document.metadata.companySlugs) {
        if (!companySlugs.has(companySlug)) {
          issues.push({
            severity,
            code: "content_company_missing",
            sourceFile: document.sourceFile,
            message: `references company "${companySlug}", which is not in tools/companies`,
          });
        }
      }
    }
  }
}

function sortIssues(
  issues: readonly CatalogValidationIssue[],
): readonly CatalogValidationIssue[] {
  const severityOrder = { error: 0, warning: 1 } as const;
  return [...issues].sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.code.localeCompare(right.code) ||
      left.sourceFile.localeCompare(right.sourceFile) ||
      left.message.localeCompare(right.message),
  );
}

export function validateCatalog(): CatalogValidationReport {
  const productResult = collectProductSources();
  const companyResult = collectCompanies();
  const observabilityResult = collectObservabilityProducts();
  const cohortResult = collectEarlyCohort();
  const contentResult = collectContentDocuments();
  const issues: CatalogValidationIssue[] = [
    ...productResult.issues,
    ...companyResult.issues,
    ...observabilityResult.issues,
    ...cohortResult.issues,
    ...contentResult.issues,
  ];

  const products = productResult.products.map((product) => ({
    slug: product.value.slug,
    sourceFile: product.sourceFile,
    logo: product.value.logo,
    screenshot: product.value.screenshot,
  }));
  const productSlugs = new Set(products.map((product) => product.slug));
  const companySlugs = new Set(companyResult.companies.map((company) => company.slug));

  pushDuplicates(products, "product", issues);
  pushDuplicates(companyResult.companies, "company", issues);
  pushDuplicates(observabilityResult.products, "observability_product", issues);

  const companyByProduct = new Map<string, string>();
  for (const company of companyResult.companies) {
    for (const productSlug of company.productSlugs) {
      const existingCompany = companyByProduct.get(productSlug);
      if (existingCompany) {
        issues.push({
          severity: "error",
          code: "product_company_conflict",
          sourceFile: company.sourceFile,
          message: `product "${productSlug}" maps to both "${existingCompany}" and "${company.slug}"`,
        });
      } else {
        companyByProduct.set(productSlug, company.slug);
      }

      if (!productSlugs.has(productSlug)) {
        issues.push({
          severity: "warning",
          code: "company_product_missing",
          sourceFile: company.sourceFile,
          message: `maps product "${productSlug}", which is not yet in tools/operate`,
        });
      }
    }
  }

  for (const product of products) {
    if (!companyByProduct.has(product.slug)) {
      issues.push({
        severity: "warning",
        code: "product_company_unmapped",
        sourceFile: product.sourceFile,
        message: `product "${product.slug}" has no explicit company mapping`,
      });
    }
    validateAsset(product.logo, product.sourceFile, `${product.slug}:logo`, issues);
    validateAsset(product.screenshot, product.sourceFile, `${product.slug}:screenshot`, issues);
  }

  for (const product of observabilityResult.products) {
    validateAsset(product.logo ?? product.screenshot, product.sourceFile, product.slug, issues);
  }

  if (cohortResult.cohort) {
    const priorities = cohortResult.cohort.entries.map((entry) => entry.priority);
    const expectedPriorities = Array.from({ length: 18 }, (_, index) => index + 1);
    if (priorities.some((priority, index) => priority !== expectedPriorities[index])) {
      issues.push({
        severity: "error",
        code: "cohort_priority_sequence",
        sourceFile: cohortResult.cohort.sourceFile,
        message: "cohort priorities must be unique and sequential from 1 through 18",
      });
    }

    for (const entry of cohortResult.cohort.entries) {
      const productExists = productSlugs.has(entry.productSlug);
      if (!productExists && entry.researchState !== "needs-product-record") {
        issues.push({
          severity: "error",
          code: "cohort_missing_product_state",
          sourceFile: cohortResult.cohort.sourceFile,
          message: `"${entry.productSlug}" is missing but researchState is "${entry.researchState}"`,
        });
      } else if (!productExists) {
        issues.push({
          severity: "warning",
          code: "cohort_product_missing",
          sourceFile: cohortResult.cohort.sourceFile,
          message: `priority ${entry.priority} requires a product record for "${entry.productSlug}"`,
        });
      }

      if (!companySlugs.has(entry.companySlug)) {
        issues.push({
          severity: "error",
          code: "cohort_company_missing",
          sourceFile: cohortResult.cohort.sourceFile,
          message: `priority ${entry.priority} references missing company "${entry.companySlug}"`,
        });
      }

      const mappedCompany = companyByProduct.get(entry.productSlug);
      if (mappedCompany && mappedCompany !== entry.companySlug) {
        issues.push({
          severity: "error",
          code: "cohort_company_mismatch",
          sourceFile: cohortResult.cohort.sourceFile,
          message: `"${entry.productSlug}" maps to "${mappedCompany}", not "${entry.companySlug}"`,
        });
      }
    }
  }

  validateContentReferences(
    contentResult.documents,
    productSlugs,
    companySlugs,
    issues,
  );

  const sortedIssues = sortIssues(issues);
  return {
    valid: !sortedIssues.some((issue) => issue.severity === "error"),
    counts: {
      products: productResult.products.length,
      observabilityProducts: observabilityResult.products.length,
      companies: companyResult.companies.length,
      cohortEntries: cohortResult.cohort?.entries.length ?? 0,
      contentDocuments: contentResult.documents.length,
    },
    issues: sortedIssues,
  };
}
