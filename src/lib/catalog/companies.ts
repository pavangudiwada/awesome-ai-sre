import { readdirSync } from "node:fs";
import path from "node:path";

import type { CatalogCompany, CatalogValidationIssue } from "../../types/catalog";
import { throwForCatalogIssues } from "./errors";
import { fromRepoRoot } from "./paths";
import { companySchema } from "./schemas";
import { parseYamlFile } from "./yaml";

export interface CompanyCollectionResult {
  readonly companies: readonly CatalogCompany[];
  readonly issues: readonly CatalogValidationIssue[];
}

export function collectCompanies(): CompanyCollectionResult {
  const directory = fromRepoRoot("tools", "companies");
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort((left, right) => left.localeCompare(right));

  const companies: CatalogCompany[] = [];
  const issues: CatalogValidationIssue[] = [];

  for (const file of files) {
    const result = parseYamlFile(path.join(directory, file), companySchema);
    issues.push(...result.issues);
    if (!result.parsed) {
      continue;
    }

    const company = { ...result.parsed.value, sourceFile: result.parsed.sourceFile };
    const expectedSlug = path.basename(file, ".yaml");
    if (company.slug !== expectedSlug) {
      issues.push({
        severity: "error",
        code: "company_filename_mismatch",
        sourceFile: company.sourceFile,
        message: `slug "${company.slug}" does not match filename "${expectedSlug}"`,
      });
    }
    companies.push(company);
  }

  return {
    companies: companies.sort((left, right) => left.slug.localeCompare(right.slug)),
    issues,
  };
}

export function getCompanies(): readonly CatalogCompany[] {
  const result = collectCompanies();
  throwForCatalogIssues("Company catalog is invalid", result.issues);
  return result.companies;
}

export function getCompanyBySlug(slug: string): CatalogCompany | undefined {
  return getCompanies().find((company) => company.slug === slug);
}

export function getCompanySlugByProductSlug(
  companies: readonly CatalogCompany[],
): ReadonlyMap<string, string> {
  const mappings = new Map<string, string>();
  for (const company of companies) {
    for (const productSlug of company.productSlugs) {
      if (!mappings.has(productSlug)) {
        mappings.set(productSlug, company.slug);
      }
    }
  }
  return mappings;
}
