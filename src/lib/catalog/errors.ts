import type { CatalogValidationIssue } from "../../types/catalog";

export class CatalogDataError extends Error {
  readonly issues: readonly CatalogValidationIssue[];

  constructor(message: string, issues: readonly CatalogValidationIssue[]) {
    super(message);
    this.name = "CatalogDataError";
    this.issues = issues;
  }
}

export function throwForCatalogIssues(
  message: string,
  issues: readonly CatalogValidationIssue[],
): void {
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new CatalogDataError(message, errors);
  }
}
