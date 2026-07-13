import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

import type {
  BlogMetadata,
  CatalogValidationIssue,
  ComparisonMetadata,
  ContentDocument,
  ContentKind,
  ContentMetadata,
  ResourceMetadata,
  UpdateMetadata,
} from "../../types/catalog";
import { throwForCatalogIssues } from "./errors";
import { fromRepoRoot, toRepoRelative } from "./paths";
import { contentMetadataSchema } from "./schemas";

const CONTENT_DIRECTORIES: Readonly<Record<ContentKind, string>> = {
  comparison: "comparisons",
  resource: "resources",
  blog: "blog",
  update: "updates",
};

export interface ContentCollectionResult {
  readonly documents: readonly ContentDocument[];
  readonly issues: readonly CatalogValidationIssue[];
}

function parseMdxFile(absolutePath: string, expectedKind: ContentKind): ContentCollectionResult {
  const sourceFile = toRepoRelative(absolutePath);
  const source = readFileSync(absolutePath, "utf8");
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);

  if (!frontmatterMatch) {
    return {
      documents: [],
      issues: [
        {
          severity: "error",
          code: "missing_frontmatter",
          sourceFile,
          message: "MDX document must start with YAML frontmatter",
        },
      ],
    };
  }

  let rawMetadata: unknown;
  try {
    rawMetadata = loadYaml(frontmatterMatch[1]);
  } catch (error) {
    return {
      documents: [],
      issues: [
        {
          severity: "error",
          code: "invalid_frontmatter_yaml",
          sourceFile,
          message: error instanceof Error ? error.message : "Frontmatter could not be parsed",
        },
      ],
    };
  }

  const result = contentMetadataSchema.safeParse(rawMetadata);
  if (!result.success) {
    return {
      documents: [],
      issues: result.error.issues.map((issue) => ({
        severity: "error" as const,
        code: "content_schema_error",
        sourceFile,
        message: `${issue.path.join(".") || "root"}: ${issue.message}`,
      })),
    };
  }

  const metadata = result.data;
  const issues: CatalogValidationIssue[] = [];
  if (metadata.kind !== expectedKind) {
    issues.push({
      severity: "error",
      code: "content_kind_mismatch",
      sourceFile,
      message: `kind "${metadata.kind}" does not match directory "${expectedKind}"`,
    });
  }

  const expectedSlug = path.basename(absolutePath, ".mdx");
  if (metadata.slug !== expectedSlug) {
    issues.push({
      severity: "error",
      code: "content_filename_mismatch",
      sourceFile,
      message: `slug "${metadata.slug}" does not match filename "${expectedSlug}"`,
    });
  }

  const body = source.slice(frontmatterMatch[0].length).trim();
  if (!body) {
    issues.push({
      severity: "error",
      code: "empty_content_body",
      sourceFile,
      message: "MDX document body cannot be empty",
    });
  }

  return {
    documents: [{ metadata, body, sourceFile }],
    issues,
  };
}

export function collectContentDocuments(kind?: ContentKind): ContentCollectionResult {
  const kinds = kind ? [kind] : (Object.keys(CONTENT_DIRECTORIES) as ContentKind[]);
  const documents: ContentDocument[] = [];
  const issues: CatalogValidationIssue[] = [];

  for (const currentKind of kinds) {
    const directory = fromRepoRoot("content", CONTENT_DIRECTORIES[currentKind]);
    if (!existsSync(directory)) {
      continue;
    }

    const files = readdirSync(directory)
      .filter((file) => file.endsWith(".mdx"))
      .sort((left, right) => left.localeCompare(right));
    for (const file of files) {
      const result = parseMdxFile(path.join(directory, file), currentKind);
      documents.push(...result.documents);
      issues.push(...result.issues);
    }
  }

  return {
    documents: documents.sort((left, right) =>
      left.metadata.slug.localeCompare(right.metadata.slug),
    ),
    issues,
  };
}

export function getAllContentDocuments(kind?: ContentKind): readonly ContentDocument[] {
  const result = collectContentDocuments(kind);
  throwForCatalogIssues("Content catalog is invalid", result.issues);
  return result.documents;
}

export function getAnyContentDocument(
  kind: ContentKind,
  slug: string,
): ContentDocument | undefined {
  return getAllContentDocuments(kind).find((document) => document.metadata.slug === slug);
}

export function getPublishedContentDocuments(
  kind?: ContentKind,
): readonly ContentDocument[] {
  return getAllContentDocuments(kind).filter((document) =>
    isPublishedContent(document.metadata),
  );
}

export function getPublishedContentDocument(
  kind: ContentKind,
  slug: string,
): ContentDocument | undefined {
  return getPublishedContentDocuments(kind).find(
    (document) => document.metadata.slug === slug,
  );
}

/** Public routes should use this loader; drafts are excluded by default. */
export function getContentDocuments(kind?: ContentKind): readonly ContentDocument[] {
  return getPublishedContentDocuments(kind);
}

export function getContentDocument(
  kind: ContentKind,
  slug: string,
): ContentDocument | undefined {
  return getPublishedContentDocument(kind, slug);
}

export function getComparisons(): readonly ContentDocument<ComparisonMetadata>[] {
  return getPublishedContentDocuments(
    "comparison",
  ) as readonly ContentDocument<ComparisonMetadata>[];
}

export function getResources(): readonly ContentDocument<ResourceMetadata>[] {
  return getPublishedContentDocuments(
    "resource",
  ) as readonly ContentDocument<ResourceMetadata>[];
}

export function getBlogPosts(): readonly ContentDocument<BlogMetadata>[] {
  return getPublishedContentDocuments("blog") as readonly ContentDocument<BlogMetadata>[];
}

export function getUpdates(): readonly ContentDocument<UpdateMetadata>[] {
  return getPublishedContentDocuments("update") as readonly ContentDocument<UpdateMetadata>[];
}

export function isPublishedContent(metadata: ContentMetadata): boolean {
  return metadata.status === "published";
}
