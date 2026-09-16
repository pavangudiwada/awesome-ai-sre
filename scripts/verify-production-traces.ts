#!/usr/bin/env tsx

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const tracedExtensions = new Set([".yaml", ".yml", ".mdx"]);

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(entryPath) : [entryPath];
  });
}

const expected = ["tools", "content"].flatMap((directory) =>
  filesBelow(path.join(root, directory)).filter((file) =>
    tracedExtensions.has(path.extname(file)),
  ),
);
const traceDirectory = path.join(root, ".next", "server");
if (!statSync(traceDirectory).isDirectory())
  throw new Error("Next.js trace output is missing; run next build first");
const traceFiles = filesBelow(traceDirectory).filter((file) =>
  file.endsWith(".nft.json"),
);
const traced = new Set(
  traceFiles.flatMap((traceFile) => {
    const trace = JSON.parse(readFileSync(traceFile, "utf8")) as {
      files?: string[];
    };
    return (trace.files ?? []).map((file) =>
      path.resolve(path.dirname(traceFile), file),
    );
  }),
);
const missing = expected.filter((file) => !traced.has(file));
if (missing.length)
  throw new Error(
    `Standalone trace excludes ${missing.length} catalog/content source file(s):\n${missing.map((file) => `- ${path.relative(root, file)}`).join("\n")}`,
  );
process.stdout.write(
  `Verified ${expected.filter((file) => /\.(yaml|yml)$/.test(file)).length} YAML and ${expected.filter((file) => file.endsWith(".mdx")).length} MDX source files in ${traceFiles.length} Next.js trace manifest(s).\n`,
);
