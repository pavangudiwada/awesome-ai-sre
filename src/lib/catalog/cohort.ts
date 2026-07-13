import type { CatalogValidationIssue, EarlyCohort } from "../../types/catalog";
import { throwForCatalogIssues } from "./errors";
import { fromRepoRoot } from "./paths";
import { earlyCohortSchema } from "./schemas";
import { parseYamlFile } from "./yaml";

export interface CohortResult {
  readonly cohort?: EarlyCohort;
  readonly issues: readonly CatalogValidationIssue[];
}

export function collectEarlyCohort(): CohortResult {
  const result = parseYamlFile(
    fromRepoRoot("tools", "companies", "_early-18.yaml"),
    earlyCohortSchema,
  );
  if (!result.parsed) {
    return { issues: result.issues };
  }

  return {
    cohort: {
      ...result.parsed.value,
      entries: [...result.parsed.value.entries].sort(
        (left, right) => left.priority - right.priority,
      ),
      sourceFile: result.parsed.sourceFile,
    },
    issues: result.issues,
  };
}

export function getEarlyCohort(): EarlyCohort {
  const result = collectEarlyCohort();
  throwForCatalogIssues("Early cohort manifest is invalid", result.issues);
  if (!result.cohort) {
    throw new Error("Early cohort manifest is missing");
  }
  return result.cohort;
}
