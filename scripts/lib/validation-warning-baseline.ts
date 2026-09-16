import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { CatalogValidationIssue } from "../../src/types/catalog";

const baselineSchema = z
  .object({
    version: z.literal(1),
    catalog: z.array(z.string().min(1)).refine((values) => {
      return new Set(values).size === values.length;
    }, "catalog warning identities must be unique"),
    assets: z.array(z.string().min(1)).refine((values) => {
      return new Set(values).size === values.length;
    }, "asset warning identities must be unique"),
  })
  .strict();

export interface AssetWarningIdentityInput {
  readonly code: string;
  readonly family: string;
  readonly slug: string;
  readonly kind: string;
  readonly assetPath?: string;
}

export function catalogWarningIdentity(
  issue: Pick<CatalogValidationIssue, "code" | "sourceFile" | "recordId">,
): string {
  return [issue.code, issue.sourceFile, issue.recordId ?? "source"].join("|");
}

export function assetWarningIdentity(
  issue: AssetWarningIdentityInput,
): string {
  return [
    issue.code,
    issue.family,
    issue.slug,
    issue.kind,
    issue.assetPath ?? "none",
  ].join("|");
}

export function findNewWarningIdentities(
  currentIdentities: readonly string[],
  acceptedIdentities: readonly string[],
): string[] {
  const accepted = new Set(acceptedIdentities);
  return [...new Set(currentIdentities)]
    .filter((identity) => !accepted.has(identity))
    .sort((left, right) => left.localeCompare(right));
}

export function loadValidationWarningBaseline(repoRoot: string) {
  const baselinePath = path.join(
    repoRoot,
    "config",
    "validation-warning-baseline.json",
  );
  return baselineSchema.parse(
    JSON.parse(readFileSync(baselinePath, "utf8")) as unknown,
  );
}
