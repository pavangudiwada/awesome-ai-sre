#!/usr/bin/env tsx

/**
 * Fetches a small, reviewed allowlist of first-party GitHub release feeds.
 * This script never updates MDX, catalog YAML, or PostgreSQL. Its only output
 * is a deterministic operator-review queue committed independently of content.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

const sourceSchema = z.object({
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  feedUrl: z.string().url().refine(
    (url) => {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "github.com" &&
        parsed.pathname.endsWith("/releases.atom")
      );
    },
    "Review feeds must be first-party GitHub release Atom URLs",
  ),
});

const sourceFileSchema = z.object({
  version: z.literal(1),
  sources: z.array(sourceSchema).min(1).max(20),
});

const candidateSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{64}$/),
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sourceFeedUrl: z.string().url(),
  sourceUrl: z.string().url(),
  title: z.string().min(1).max(300),
  summary: z.string().max(2000),
  publishedAt: z.string().datetime({ offset: true }),
});

const outputSchema = z.object({
  schemaVersion: z.literal(1),
  // null makes output deterministic: provenance lives in the artifact/run,
  // instead of creating a noisy diff every day.
  generatedAt: z.null(),
  items: z.array(candidateSchema),
});

type FeedSource = z.infer<typeof sourceSchema>;
type Candidate = z.infer<typeof candidateSchema>;

const textFromXml = (value: string) =>
  value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/&#(x[0-9a-fA-F]+|\d+);/g, (_match, entity: string) => {
      const code = entity.startsWith("x")
        ? Number.parseInt(entity.slice(1), 16)
        : Number.parseInt(entity, 10);
      return Number.isSafeInteger(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&(amp|lt|gt|quot|apos);/g, (_match, entity: string) => {
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity] ?? "";
    })
    // GitHub's Atom content can be escaped twice (for XML, then HTML).
    .replace(/&(amp|lt|gt|quot|apos);/g, (_match, entity: string) => {
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity] ?? "";
    })
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function tagValue(entry: string, tag: "id" | "title" | "published" | "updated" | "content" | "summary") {
  const match = entry.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? textFromXml(match[1]) : "";
}

function entryLink(entry: string) {
  const links = [...entry.matchAll(/<link\b([^>]*)\/?>(?:<\/link>)?/gi)];
  for (const link of links) {
    const attributes = link[1];
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const relation = attributes.match(/\brel=["']([^"']+)["']/i)?.[1];
    if (href && (!relation || relation === "alternate")) return textFromXml(href);
  }
  return "";
}

function normalizedIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export function parseGitHubReleaseAtom(source: FeedSource, body: string): Candidate[] {
  if (!/<feed\b/i.test(body)) throw new Error(`${source.feedUrl} is not an Atom feed`);
  const entries = [...body.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const candidates: Candidate[] = [];
  for (const entryMatch of entries) {
    const entry = entryMatch[1];
    const sourceId = tagValue(entry, "id");
    const title = tagValue(entry, "title");
    const sourceUrl = entryLink(entry);
    const publishedAt = normalizedIso(tagValue(entry, "published") || tagValue(entry, "updated"));
    const summary = (tagValue(entry, "content") || tagValue(entry, "summary")).slice(0, 2000);
    const safeUrl = z.string().url().safeParse(sourceUrl);
    if (!sourceId || !title || !safeUrl.success || !publishedAt) continue;
    const parsedUrl = new URL(safeUrl.data);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") continue;
    candidates.push({
      id: createHash("sha256")
        .update(`${source.productSlug}\n${sourceId}`)
        .digest("hex"),
      productSlug: source.productSlug,
      sourceFeedUrl: source.feedUrl,
      sourceUrl: safeUrl.data,
      title: title.slice(0, 300),
      summary,
      publishedAt,
    });
  }
  return candidates;
}

async function fetchFeed(source: FeedSource, fetchImpl: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImpl(source.feedUrl, {
      headers: {
        Accept: "application/atom+xml, application/xml;q=0.9",
        "User-Agent": "ai-sre-watchlist-review-feed/1.0",
      },
      redirect: "error",
      signal: controller.signal,
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok) throw new Error(`${source.feedUrl} returned HTTP ${response.status}`);
    if (!/\b(atom|xml)\b/i.test(contentType))
      throw new Error(`${source.feedUrl} did not return Atom/XML content`);
    if (declaredSize > 2_000_000) throw new Error(`${source.feedUrl} exceeds 2 MB`);
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error(`${source.feedUrl} exceeds 2 MB`);
    return parseGitHubReleaseAtom(source, body);
  } finally {
    clearTimeout(timeout);
  }
}

export function deterministicQueue(items: Candidate[]) {
  const deduped = new Map(items.map((item) => [item.id, item]));
  return outputSchema.parse({
    schemaVersion: 1,
    generatedAt: null,
    items: [...deduped.values()].sort((a, b) =>
      a.productSlug.localeCompare(b.productSlug) ||
      b.publishedAt.localeCompare(a.publishedAt) ||
      a.id.localeCompare(b.id),
    ),
  });
}

export async function collectReleaseCandidates(options: {
  sourcePath?: string;
  outputPath?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const sourcePath = options.sourcePath ?? path.resolve("config/review-feed-sources.json");
  const outputPath = options.outputPath ?? path.resolve("data/review-queue/release-candidates.json");
  const sources = sourceFileSchema.parse(JSON.parse(await readFile(sourcePath, "utf8"))).sources;
  const groups = await Promise.all(sources.map((source) => fetchFeed(source, options.fetchImpl ?? fetch)));
  const queue = deterministicQueue(groups.flat());
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  return queue;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  collectReleaseCandidates()
    .then((queue) => process.stdout.write(`Wrote ${queue.items.length} review candidate(s).\n`))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
