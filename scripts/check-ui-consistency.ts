#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RuleId =
  | "non_global_css"
  | "raw_palette_class"
  | "raw_color_literal"
  | "legacy_sidebar_import"
  | "inline_style_prop"
  | "space_axis_utility"
  | "legacy_product_follows"
  | "claimed_in_presentation"
  | "fake_verified_label"
  | "overlay_title_missing"
  | "raw_interactive_primitive"
  | "raw_breadcrumb"
  | "raw_separator";

interface Violation {
  readonly rule: RuleId;
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

interface OverlayRule {
  readonly content: string;
  readonly title: string;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = path.join(ROOT, "src");
const APP_ROOT = path.join(SOURCE_ROOT, "app");
const COMPONENTS_ROOT = path.join(SOURCE_ROOT, "components");
const SHADCN_ROOT = path.join(COMPONENTS_ROOT, "ui");
const PRESENTATION_ROOT = path.join(SOURCE_ROOT, "lib", "presentation");
const ALLOWED_GLOBAL_CSS = new Set([
  "src/app/globals.css",
]);
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const CSS_EXTENSIONS = [".css", ".scss", ".sass", ".less"];
const OVERLAY_RULES: readonly OverlayRule[] = [
  { content: "AlertDialogContent", title: "AlertDialogTitle" },
  { content: "DialogContent", title: "DialogTitle" },
  { content: "DrawerContent", title: "DrawerTitle" },
  { content: "SheetContent", title: "SheetTitle" },
];

const RAW_PALETTE_CLASS = new RegExp(
  String.raw`\b(?:bg|text|border(?:-[trblxy])?|ring|outline|divide(?:-[xy])?|shadow|fill|stroke|from|via|to|accent|caret)-(?:white|black|slate-[0-9]{2,3}|gray-[0-9]{2,3}|zinc-[0-9]{2,3}|neutral-[0-9]{2,3}|stone-[0-9]{2,3}|red-[0-9]{2,3}|orange-[0-9]{2,3}|amber-[0-9]{2,3}|yellow-[0-9]{2,3}|lime-[0-9]{2,3}|green-[0-9]{2,3}|emerald-[0-9]{2,3}|teal-[0-9]{2,3}|cyan-[0-9]{2,3}|sky-[0-9]{2,3}|blue-[0-9]{2,3}|indigo-[0-9]{2,3}|violet-[0-9]{2,3}|purple-[0-9]{2,3}|fuchsia-[0-9]{2,3}|pink-[0-9]{2,3}|rose-[0-9]{2,3})(?:\/[0-9]{1,3})?\b`,
  "g",
);
const RAW_COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\s*\(/g;
const LEGACY_SIDEBAR_IMPORT =
  /\bfrom\s+["'][^"']*(?:^|\/)sidebar(?:\.[^"']+)?["']/gm;
const INLINE_STYLE_PROP = /\bstyle\s*=/g;
const SPACE_AXIS_UTILITY = /\bspace-[xy]-[^\s"'`}]+/g;
const LEGACY_PRODUCT_FOLLOWS = /\bproduct_follows\b/g;
const CLAIMED_TERM = /(?:\.\s*claimed\b|\bclaimed\s*:|\[\s*["']claimed["']\s*\])/gi;
const VERIFIED_LABEL = /["'`]Verified["'`]/gi;
const RAW_INTERACTIVE_PRIMITIVES: readonly {
  readonly pattern: RegExp;
  readonly name: string;
}[] = [
  { pattern: /<button\b/g, name: "button" },
  { pattern: /<select\b/g, name: "select" },
  { pattern: /<textarea\b/g, name: "textarea" },
  {
    pattern: /<input\b(?![^>]*\btype\s*=\s*["']hidden["'])[^>]*>/g,
    name: "input",
  },
];
const RAW_BREADCRUMB = /<nav\b[^>]*aria-label\s*=\s*["']Breadcrumb["'][^>]*>/gi;
const RAW_SEPARATOR = /<hr\b/g;

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
    });
}

function relativePath(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (source.charCodeAt(position) === 10) line += 1;
  }
  return line;
}

function collectMatches(
  violations: Violation[],
  source: string,
  file: string,
  rule: RuleId,
  pattern: RegExp,
  message: (match: RegExpExecArray) => string,
): void {
  pattern.lastIndex = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    violations.push({
      rule,
      file,
      line: lineAt(source, match.index),
      message: message(match),
    });

    if (match[0].length === 0) pattern.lastIndex += 1;
  }
}

function findClosingTag(
  source: string,
  component: string,
  openingIndex: number,
): number | null {
  const tokenPattern = new RegExp(`<\\/?${component}\\b[^>]*>`, "g");
  tokenPattern.lastIndex = openingIndex;
  let depth = 0;

  for (let match = tokenPattern.exec(source); match; match = tokenPattern.exec(source)) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return tokenPattern.lastIndex;
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  return null;
}

function scanOverlayTitles(
  violations: Violation[],
  source: string,
  file: string,
): void {
  for (const overlay of OVERLAY_RULES) {
    const openingPattern = new RegExp(`<${overlay.content}\\b[^>]*>`, "g");
    for (
      let opening = openingPattern.exec(source);
      opening;
      opening = openingPattern.exec(source)
    ) {
      if (opening[0].endsWith("/>")) continue;

      const closingIndex = findClosingTag(source, overlay.content, opening.index);
      if (closingIndex === null) continue;

      const overlaySource = source.slice(opening.index, closingIndex);
      if (!new RegExp(`<${overlay.title}\\b`).test(overlaySource)) {
        violations.push({
          rule: "overlay_title_missing",
          file,
          line: lineAt(source, opening.index),
          message: `${overlay.content} must contain ${overlay.title}`,
        });
      }
    }
  }
}

function isWithin(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== "..";
}

function main(): void {
  const violations: Violation[] = [];
  const allSourceFiles = walkFiles(SOURCE_ROOT);
  const cssFiles = allSourceFiles.filter((filePath) =>
    CSS_EXTENSIONS.some((extension) => filePath.endsWith(extension)),
  );

  for (const cssFile of cssFiles) {
    const file = relativePath(cssFile);
    if (!ALLOWED_GLOBAL_CSS.has(file)) {
      violations.push({
        rule: "non_global_css",
        file,
        line: 1,
        message: "Page and component CSS files are forbidden; use shadcn composition and global tokens",
      });
    }
  }

  const ignoredLegacyFiles = new Set<string>();
  const codeFiles = allSourceFiles.filter(
    (filePath) =>
      SOURCE_EXTENSIONS.has(path.extname(filePath)) &&
      !ignoredLegacyFiles.has(filePath),
  );

  for (const filePath of codeFiles) {
    const file = relativePath(filePath);
    const source = readFileSync(filePath, "utf8");
    const isFirstPartyComponent =
      isWithin(filePath, COMPONENTS_ROOT) && !isWithin(filePath, SHADCN_ROOT);
    const isComposition = isWithin(filePath, APP_ROOT) || isFirstPartyComponent;
    const isPresentation = isComposition || isWithin(filePath, PRESENTATION_ROOT);

    collectMatches(
      violations,
      source,
      file,
      "legacy_sidebar_import",
      LEGACY_SIDEBAR_IMPORT,
      () => "The public product must not import the legacy Sidebar primitive",
    );
    collectMatches(
      violations,
      source,
      file,
      "legacy_product_follows",
      LEGACY_PRODUCT_FOLLOWS,
      () => "product_follows conflates Save and Follow; use saved_products or company_follows explicitly",
    );

    if (isComposition) {
      for (const primitive of RAW_INTERACTIVE_PRIMITIVES) {
        collectMatches(
          violations,
          source,
          file,
          "raw_interactive_primitive",
          primitive.pattern,
          () => `Use the official shadcn ${primitive.name} primitive instead of raw markup`,
        );
      }
      collectMatches(
        violations,
        source,
        file,
        "raw_breadcrumb",
        RAW_BREADCRUMB,
        () => "Use the official shadcn Breadcrumb composition instead of a raw nav",
      );
      collectMatches(
        violations,
        source,
        file,
        "raw_separator",
        RAW_SEPARATOR,
        () => "Use the official shadcn Separator component instead of hr",
      );
      collectMatches(
        violations,
        source,
        file,
        "raw_palette_class",
        RAW_PALETTE_CLASS,
        (match) => `Use a semantic shadcn token instead of ${match[0]}`,
      );
      collectMatches(
        violations,
        source,
        file,
        "raw_color_literal",
        RAW_COLOR_LITERAL,
        (match) => `Use a semantic global token instead of raw color ${match[0]}`,
      );
      collectMatches(
        violations,
        source,
        file,
        "inline_style_prop",
        INLINE_STYLE_PROP,
        () => "Inline style props are forbidden in Watchlist composition code",
      );
      collectMatches(
        violations,
        source,
        file,
        "space_axis_utility",
        SPACE_AXIS_UTILITY,
        (match) => `Use flex/grid gap utilities instead of ${match[0]}`,
      );
      scanOverlayTitles(violations, source, file);
    }

    if (isPresentation) {
      collectMatches(
        violations,
        source,
        file,
        "claimed_in_presentation",
        CLAIMED_TERM,
        () => "Catalog claimed state must never drive presentation or evidence status",
      );
      collectMatches(
        violations,
        source,
        file,
        "fake_verified_label",
        VERIFIED_LABEL,
        () => "Verified is forbidden without a separately reviewed evidence state",
      );
    }
  }

  const sorted = violations.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  );
  const report = {
    valid: sorted.length === 0,
    scanned: {
      codeFiles: codeFiles.length,
      cssFiles: cssFiles.length,
    },
    violations: sorted,
  };

  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(
      `UI consistency scan: ${codeFiles.length} code file(s), ${cssFiles.length} CSS file(s)\n`,
    );
    if (sorted.length === 0) {
      process.stdout.write("No UI consistency violations found.\n");
    } else {
      for (const violation of sorted) {
        process.stderr.write(
          `ERROR ${violation.rule} ${violation.file}:${violation.line} ${violation.message}\n`,
        );
      }
      process.stderr.write(`\n${sorted.length} UI consistency violation(s).\n`);
    }
  }

  if (!report.valid) process.exitCode = 1;
}

main();
