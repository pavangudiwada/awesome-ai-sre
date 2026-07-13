import { readFileSync } from "node:fs";
import { load as loadYaml } from "js-yaml";
import type { z } from "zod";

import type { CatalogValidationIssue } from "../../types/catalog";
import { toRepoRelative } from "./paths";

export interface ParsedSource<T> {
  readonly value: T;
  readonly sourceFile: string;
}

export interface ParseResult<T> {
  readonly parsed?: ParsedSource<T>;
  readonly issues: readonly CatalogValidationIssue[];
}

export function parseYamlFile<T>(absolutePath: string, schema: z.ZodType<T>): ParseResult<T> {
  const sourceFile = toRepoRelative(absolutePath);
  let raw: unknown;

  try {
    raw = loadYaml(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    return {
      issues: [
        {
          severity: "error",
          code: "invalid_yaml",
          sourceFile,
          message: error instanceof Error ? error.message : "YAML could not be parsed",
        },
      ],
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      issues: result.error.issues.map((issue) => ({
        severity: "error" as const,
        code: "schema_error",
        sourceFile,
        message: `${issue.path.join(".") || "root"}: ${issue.message}`,
      })),
    };
  }

  return {
    parsed: { value: result.data, sourceFile },
    issues: [],
  };
}
