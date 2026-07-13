#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { publishedUpdates } from "../src/db/schema";
import { getUpdates } from "../src/lib/catalog";

const environmentSchema = z.object({ DATABASE_URL: z.string().url() });

async function main() {
  const updates = getUpdates();
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    process.stdout.write(`Published update sync dry run: ${updates.length} update(s).\n`);
    return;
  }

  const { DATABASE_URL } = environmentSchema.parse(process.env);
  const client = postgres(DATABASE_URL, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    for (const document of updates) {
      if (document.metadata.sourceUrls.length === 0) {
        throw new Error(`${document.sourceFile} cannot publish without a source URL`);
      }
      const publishedAt = new Date(document.metadata.publishedAt!);
      await db
        .insert(publishedUpdates)
        .values({
          slug: document.metadata.slug,
          companySlug: document.metadata.companySlugs[0] ?? null,
          productSlug: document.metadata.productSlugs[0] ?? null,
          title: document.metadata.title,
          summary: document.metadata.description,
          contentPath: `/updates/${document.metadata.slug}`,
          sourceUrl: document.metadata.sourceUrls[0],
          publishedAt,
        })
        .onConflictDoUpdate({
          target: publishedUpdates.slug,
          set: {
            companySlug: document.metadata.companySlugs[0] ?? null,
            productSlug: document.metadata.productSlugs[0] ?? null,
            title: document.metadata.title,
            summary: document.metadata.description,
            sourceUrl: document.metadata.sourceUrls[0],
            publishedAt,
            updatedAt: new Date(),
          },
        });
    }
    process.stdout.write(`Synced ${updates.length} published update(s).\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
