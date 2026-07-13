#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";
import yaml from "js-yaml";

import { OBSERVABILITY_TOOLS } from "../src/data/observability.js";

type AssetKind = "logo" | "screenshot";
type CatalogFamily = "ai-sre" | "observability";
type Severity = "error" | "warning";
type RasterFormat = "gif" | "jpeg" | "png" | "webp";

interface CatalogAssetRecord {
  readonly family: CatalogFamily;
  readonly slug: string;
  readonly name: string;
  readonly sourceFile: string;
  readonly logo?: string;
  readonly screenshot?: string;
}

interface AssetIssue {
  readonly severity: Severity;
  readonly code: string;
  readonly family: CatalogFamily;
  readonly slug: string;
  readonly kind: AssetKind | "catalog";
  readonly assetPath?: string;
  readonly message: string;
}

interface RasterDimensions {
  readonly format: RasterFormat;
  readonly width: number;
  readonly height: number;
}

interface InspectedAsset {
  readonly assetPath: string;
  readonly kind: AssetKind;
  readonly bytes: number;
  readonly format: RasterFormat | "svg";
  readonly width?: number;
  readonly height?: number;
  readonly aspectRatio?: number;
}

interface CatalogLoadResult {
  readonly records: readonly CatalogAssetRecord[];
  readonly issues: readonly AssetIssue[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ROOT = path.join(ROOT, "public");
const OPERATE_ROOT = path.join(ROOT, "tools", "operate");
const ASSET_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"];
const EXPECTED_SCREENSHOT_ASPECT = 8 / 5;
const SCREENSHOT_ASPECT_TOLERANCE = 0.02;
const WHITE_PAINTS = new Set([
  "#fff",
  "#ffffff",
  "#ffffffff",
  "rgb(255,255,255)",
  "rgba(255,255,255,1)",
  "white",
]);
const NON_VISIBLE_PAINTS = new Set([
  "none",
  "transparent",
  "inherit",
  "currentcolor",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function relativePath(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function catalogIssue(
  family: CatalogFamily,
  slug: string,
  code: string,
  message: string,
): AssetIssue {
  return {
    severity: "error",
    code,
    family,
    slug,
    kind: "catalog",
    message,
  };
}

function loadOperateRecords(): CatalogLoadResult {
  const records: CatalogAssetRecord[] = [];
  const issues: AssetIssue[] = [];
  const files = readdirSync(OPERATE_ROOT)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const sourceFile = relativePath(path.join(OPERATE_ROOT, file));
    const fallbackSlug = path.basename(file, ".yaml");
    let parsed: unknown;

    try {
      parsed = yaml.load(readFileSync(path.join(OPERATE_ROOT, file), "utf8"));
    } catch (error) {
      issues.push(
        catalogIssue(
          "ai-sre",
          fallbackSlug,
          "catalog_parse_failed",
          `${sourceFile}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      continue;
    }

    if (!isRecord(parsed)) {
      issues.push(
        catalogIssue(
          "ai-sre",
          fallbackSlug,
          "catalog_record_invalid",
          `${sourceFile} must contain one YAML object`,
        ),
      );
      continue;
    }

    const slug = stringValue(parsed.slug) ?? fallbackSlug;
    records.push({
      family: "ai-sre",
      slug,
      name: stringValue(parsed.name) ?? slug,
      sourceFile,
      ...(stringValue(parsed.logo) ? { logo: stringValue(parsed.logo) } : {}),
      ...(stringValue(parsed.screenshot)
        ? { screenshot: stringValue(parsed.screenshot) }
        : {}),
    });
  }

  return { records, issues };
}

function loadObservabilityRecords(): CatalogLoadResult {
  const records: CatalogAssetRecord[] = [];
  const issues: AssetIssue[] = [];
  const rawCatalog: unknown = OBSERVABILITY_TOOLS;

  if (!Array.isArray(rawCatalog)) {
    return {
      records,
      issues: [
        catalogIssue(
          "observability",
          "catalog",
          "catalog_record_invalid",
          "src/data/observability.js must export OBSERVABILITY_TOOLS as an array",
        ),
      ],
    };
  }

  rawCatalog.forEach((rawRecord, index) => {
    if (!isRecord(rawRecord)) {
      issues.push(
        catalogIssue(
          "observability",
          `record-${index}`,
          "catalog_record_invalid",
          `src/data/observability.js record ${index} must be an object`,
        ),
      );
      return;
    }

    const slug = stringValue(rawRecord.slug);
    if (!slug) {
      issues.push(
        catalogIssue(
          "observability",
          `record-${index}`,
          "catalog_slug_missing",
          `src/data/observability.js record ${index} has no slug`,
        ),
      );
      return;
    }

    records.push({
      family: "observability",
      slug,
      name: stringValue(rawRecord.name) ?? slug,
      sourceFile: "src/data/observability.js",
      ...(stringValue(rawRecord.logo) ? { logo: stringValue(rawRecord.logo) } : {}),
      ...(stringValue(rawRecord.screenshot)
        ? { screenshot: stringValue(rawRecord.screenshot) }
        : {}),
    });
  });

  return { records, issues };
}

function expectedDirectory(kind: AssetKind): string {
  return kind === "logo" ? "/logos/" : "/screenshots/";
}

function resolvePublicAsset(assetPath: string): string | null {
  if (!assetPath.startsWith("/")) return null;
  const segments = assetPath.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  if (path.posix.normalize(assetPath) !== assetPath) return null;

  const resolved = path.resolve(PUBLIC_ROOT, assetPath.slice(1));
  const relative = path.relative(PUBLIC_ROOT, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

function fallbackCandidates(record: CatalogAssetRecord, kind: AssetKind): string[] {
  const directory = kind === "logo" ? "logos" : "screenshots";
  const basenames =
    record.family === "observability"
      ? [`obs-${record.slug}`, record.slug]
      : [record.slug];

  return basenames.flatMap((basename) =>
    ASSET_EXTENSIONS.map((extension) => `/${directory}/${basename}${extension}`),
  );
}

function findExistingFallback(
  record: CatalogAssetRecord,
  kind: AssetKind,
): string | undefined {
  return fallbackCandidates(record, kind).find((candidate) => {
    const filePath = resolvePublicAsset(candidate);
    return filePath ? existsSync(filePath) && statSync(filePath).isFile() : false;
  });
}

function detectRasterDimensions(buffer: Buffer): RasterDimensions | null {
  try {
    const dimensions = imageSize(buffer);
    const format = dimensions.type === "jpg" ? "jpeg" : dimensions.type;
    if (
      !dimensions.width ||
      !dimensions.height ||
      !format ||
      !["gif", "jpeg", "png", "webp"].includes(format)
    ) {
      return null;
    }
    return {
      format: format as RasterFormat,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch {
    return null;
  }
}

function normalizePaint(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "");
}

function inspectSvg(
  record: CatalogAssetRecord,
  kind: AssetKind,
  assetPath: string,
  source: string,
): AssetIssue[] {
  const issues: AssetIssue[] = [];
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
  const visibleShape =
    /<(?:path|rect|circle|ellipse|polygon|polyline|line|text|use|image)\b/i.test(
      withoutComments,
    );

  if (!/<svg\b/i.test(withoutComments)) {
    issues.push({
      severity: "error",
      code: "invalid_svg",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "File has an .svg extension but no svg root element",
    });
    return issues;
  }

  if (!visibleShape) {
    issues.push({
      severity: "warning",
      code: "svg_no_visible_shapes",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "SVG has no mechanically detectable visible shape",
    });
  }

  const paints = [
    ...withoutComments.matchAll(
      /\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi,
    ),
    ...withoutComments.matchAll(/\b(?:fill|stroke|stop-color)\s*:\s*([^;}]+)/gi),
  ].map((match) => normalizePaint(match[1]));
  const explicitPaints = paints.filter(
    (paint) => !NON_VISIBLE_PAINTS.has(paint) && !paint.startsWith("url("),
  );

  if (
    visibleShape &&
    explicitPaints.length > 0 &&
    explicitPaints.every((paint) => WHITE_PAINTS.has(paint))
  ) {
    issues.push({
      severity: "warning",
      code: "svg_likely_white_only",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "SVG appears to use only white paint and may disappear on the default surface",
    });
  }

  return issues;
}

function extensionMatchesFormat(assetPath: string, format: RasterFormat): boolean {
  const extension = path.extname(assetPath).toLowerCase();
  if (format === "jpeg") return extension === ".jpg" || extension === ".jpeg";
  return extension === `.${format}`;
}

function inspectDeclaredAsset(
  record: CatalogAssetRecord,
  kind: AssetKind,
  assetPath: string,
): { readonly issues: AssetIssue[]; readonly asset?: InspectedAsset } {
  const issues: AssetIssue[] = [];
  const expectedPrefix = expectedDirectory(kind);
  if (!assetPath.startsWith(expectedPrefix)) {
    issues.push({
      severity: "error",
      code: "asset_path_wrong_directory",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `${kind} paths must begin with ${expectedPrefix}`,
    });
    return { issues };
  }

  const filePath = resolvePublicAsset(assetPath);
  if (!filePath) {
    issues.push({
      severity: "error",
      code: "asset_path_escapes_public",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "Asset path resolves outside public/",
    });
    return { issues };
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    const fallback = findExistingFallback(record, kind);
    issues.push({
      severity: "error",
      code: "declared_asset_missing",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: fallback
        ? `Declared file is missing; existing same-slug candidate: ${fallback}`
        : "Declared file is missing and no same-slug candidate exists",
    });
    return { issues };
  }

  const expectedRoot = realpathSync(
    path.join(PUBLIC_ROOT, kind === "logo" ? "logos" : "screenshots"),
  );
  if (lstatSync(filePath).isSymbolicLink()) {
    issues.push({
      severity: "error",
      code: "asset_symlink_forbidden",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "Catalog assets must be regular files, not symbolic links",
    });
    return { issues };
  }
  const realFile = realpathSync(filePath);
  const physicalRelative = path.relative(expectedRoot, realFile);
  if (
    physicalRelative === ".." ||
    physicalRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(physicalRelative)
  ) {
    issues.push({
      severity: "error",
      code: "asset_path_escapes_kind_directory",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `Asset must resolve inside public/${kind === "logo" ? "logos" : "screenshots"}`,
    });
    return { issues };
  }

  const bytes = statSync(filePath).size;
  if (bytes === 0) {
    issues.push({
      severity: "error",
      code: "asset_zero_bytes",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "Asset file is empty",
    });
    return { issues };
  }

  const buffer = readFileSync(filePath);
  if (path.extname(assetPath).toLowerCase() === ".svg") {
    issues.push(...inspectSvg(record, kind, assetPath, buffer.toString("utf8")));
    return {
      issues,
      asset: { assetPath, kind, bytes, format: "svg" },
    };
  }

  const dimensions = detectRasterDimensions(buffer);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    issues.push({
      severity: "error",
      code: "raster_dimensions_unreadable",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: "Could not read raster dimensions from PNG, JPEG, GIF, or WebP data",
    });
    return { issues };
  }

  const aspectRatio = dimensions.width / dimensions.height;
  if (!extensionMatchesFormat(assetPath, dimensions.format)) {
    issues.push({
      severity: "warning",
      code: "raster_extension_mismatch",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `File extension does not match detected ${dimensions.format} data`,
    });
  }

  if (
    kind === "screenshot" &&
    Math.abs(aspectRatio - EXPECTED_SCREENSHOT_ASPECT) > SCREENSHOT_ASPECT_TOLERANCE
  ) {
    issues.push({
      severity: "warning",
      code: "screenshot_aspect_unexpected",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `Screenshot is ${dimensions.width}x${dimensions.height} (${aspectRatio.toFixed(3)}), expected 8:5`,
    });
  }

  if (kind === "logo" && (dimensions.width < 32 || dimensions.height < 32)) {
    issues.push({
      severity: "warning",
      code: "logo_raster_too_small",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `Logo is only ${dimensions.width}x${dimensions.height}`,
    });
  }

  if (kind === "logo" && (aspectRatio > 12 || aspectRatio < 1 / 12)) {
    issues.push({
      severity: "warning",
      code: "logo_aspect_extreme",
      family: record.family,
      slug: record.slug,
      kind,
      assetPath,
      message: `Logo aspect ratio ${aspectRatio.toFixed(3)} is unusually extreme`,
    });
  }

  return {
    issues,
    asset: {
      assetPath,
      kind,
      bytes,
      format: dimensions.format,
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: Number(aspectRatio.toFixed(4)),
    },
  };
}

function auditRecords(records: readonly CatalogAssetRecord[]): {
  readonly issues: readonly AssetIssue[];
  readonly assets: readonly InspectedAsset[];
} {
  const issues: AssetIssue[] = [];
  const assetsByPath = new Map<string, InspectedAsset>();

  for (const record of records) {
    for (const kind of ["logo", "screenshot"] as const) {
      const declaredPath = record[kind];
      if (!declaredPath) {
        const fallback = findExistingFallback(record, kind);
        issues.push({
          severity: "warning",
          code: `missing_${kind}_reference`,
          family: record.family,
          slug: record.slug,
          kind,
          message: fallback
            ? `${kind} is not declared; existing same-slug asset: ${fallback}`
            : `${kind} is not declared and no same-slug asset exists`,
        });
        continue;
      }

      const inspected = inspectDeclaredAsset(record, kind, declaredPath);
      issues.push(...inspected.issues);
      if (inspected.asset && !assetsByPath.has(inspected.asset.assetPath)) {
        assetsByPath.set(inspected.asset.assetPath, inspected.asset);
      }
    }
  }

  return {
    issues,
    assets: [...assetsByPath.values()].sort((left, right) =>
      left.assetPath.localeCompare(right.assetPath),
    ),
  };
}

function main(): void {
  const operate = loadOperateRecords();
  const observability = loadObservabilityRecords();
  const records = [...operate.records, ...observability.records].sort(
    (left, right) =>
      left.family.localeCompare(right.family) || left.slug.localeCompare(right.slug),
  );
  const audit = auditRecords(records);
  const issues = [...operate.issues, ...observability.issues, ...audit.issues].sort(
    (left, right) =>
      left.severity.localeCompare(right.severity) ||
      left.family.localeCompare(right.family) ||
      left.slug.localeCompare(right.slug) ||
      left.kind.localeCompare(right.kind) ||
      left.code.localeCompare(right.code),
  );
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const rasterAssets = audit.assets.filter((asset) => asset.format !== "svg");
  const screenshotRasters = rasterAssets.filter((asset) => asset.kind === "screenshot");
  const expectedAspectScreenshots = screenshotRasters.filter(
    (asset) =>
      asset.aspectRatio !== undefined &&
      Math.abs(asset.aspectRatio - EXPECTED_SCREENSHOT_ASPECT) <=
        SCREENSHOT_ASPECT_TOLERANCE,
  );
  const report = {
    valid: errors.length === 0,
    counts: {
      operateRecords: operate.records.length,
      observabilityRecords: observability.records.length,
      totalRecords: records.length,
      inspectedAssets: audit.assets.length,
      rasterAssets: rasterAssets.length,
      screenshotsAtEightByFive: expectedAspectScreenshots.length,
      screenshotRasters: screenshotRasters.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    issues,
    assets: audit.assets,
  };

  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        "AI SRE Watchlist asset audit",
        `Catalog records: ${operate.records.length} operate + ${observability.records.length} observability = ${records.length}`,
        `Inspected assets: ${audit.assets.length} (${rasterAssets.length} raster)`,
        `8:5 raster screenshots: ${expectedAspectScreenshots.length}/${screenshotRasters.length}`,
        "",
      ].join("\n"),
    );

    for (const issue of issues) {
      const asset = issue.assetPath ? ` ${issue.assetPath}` : "";
      process.stdout.write(
        `${issue.severity.toUpperCase()} ${issue.code} ${issue.family}/${issue.slug}/${issue.kind}${asset}: ${issue.message}\n`,
      );
    }

    process.stdout.write(`\n${errors.length} error(s), ${warnings.length} warning(s)\n`);

    if (process.argv.includes("--verbose")) {
      process.stdout.write("\nRaster dimensions\n");
      for (const asset of rasterAssets) {
        process.stdout.write(
          `${asset.assetPath} ${asset.width}x${asset.height} aspect=${asset.aspectRatio}\n`,
        );
      }
    }
  }

  const failOnWarnings = process.argv.includes("--strict");
  const warningBudgetArgument = process.argv.find((argument) =>
    argument.startsWith("--max-warnings="),
  );
  const warningBudget = warningBudgetArgument
    ? Number.parseInt(warningBudgetArgument.split("=")[1] ?? "", 10)
    : null;
  const exceededWarningBudget =
    warningBudget !== null &&
    Number.isFinite(warningBudget) &&
    warnings.length > warningBudget;
  if (exceededWarningBudget) {
    process.stderr.write(
      `Asset warning budget exceeded: ${warnings.length} > ${warningBudget}.\n`,
    );
  }
  if (
    errors.length > 0 ||
    (failOnWarnings && warnings.length > 0) ||
    exceededWarningBudget
  ) {
    process.exitCode = 1;
  }
}

main();
