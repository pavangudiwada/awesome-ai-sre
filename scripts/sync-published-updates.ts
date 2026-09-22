#!/usr/bin/env tsx

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { publishedUpdates } from "../src/db/schema";
import { getUpdates } from "../src/lib/catalog";
import { fileBackedSlugsToRetire } from "../src/lib/presentation/published-update-sync";

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
          retiredAt: null,
        })
        .onConflictDoUpdate({
          target: publishedUpdates.slug,
          where: sql`${publishedUpdates.contentPath} is not null`,
          set: {
            companySlug: document.metadata.companySlugs[0] ?? null,
            productSlug: document.metadata.productSlugs[0] ?? null,
            title: document.metadata.title,
            summary: document.metadata.description,
            contentPath: `/updates/${document.metadata.slug}`,
            sourceUrl: document.metadata.sourceUrls[0],
            publishedAt,
            retiredAt: null,
            updatedAt: new Date(),
          },
        });
    }
    const fileSlugs = new Set(updates.map((update) => update.metadata.slug));
    const fileRows = await db
      .select({ slug: publishedUpdates.slug })
      .from(publishedUpdates)
      .where(sql`${publishedUpdates.contentPath} is not null and ${publishedUpdates.retiredAt} is null`);
    for (const slug of fileBackedSlugsToRetire(fileRows.map((row) => row.slug), fileSlugs)) {
      await db
        .update(publishedUpdates)
        .set({ retiredAt: new Date(), updatedAt: new Date() })
        .where(eq(publishedUpdates.slug, slug));
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
