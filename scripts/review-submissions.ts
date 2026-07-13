#!/usr/bin/env tsx

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { editorialSubmissions } from "../src/db/schema";

const environmentSchema = z.object({ DATABASE_URL: z.string().url() });
const idSchema = z.string().uuid();
const statusSchema = z.enum(["pending", "reviewing", "accepted", "rejected"]);

async function main() {
  const [command = "list", id, status] = process.argv.slice(2);
  const { DATABASE_URL } = environmentSchema.parse(process.env);
  const client = postgres(DATABASE_URL, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    if (command === "list") {
      const rows = await db
        .select({
          id: editorialSubmissions.id,
          type: editorialSubmissions.submissionType,
          company: editorialSubmissions.companySlug,
          product: editorialSubmissions.productSlug,
          source: editorialSubmissions.sourceUrl,
          status: editorialSubmissions.status,
          submittedAt: editorialSubmissions.submittedAt,
        })
        .from(editorialSubmissions);
      process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
      return;
    }
    if (command !== "set") throw new Error("Use: list | set <uuid> <pending|reviewing|accepted|rejected>");
    const submissionId = idSchema.parse(id);
    const nextStatus = statusSchema.parse(status);
    const rows = await db
      .update(editorialSubmissions)
      .set({ status: nextStatus, reviewedAt: new Date() })
      .where(eq(editorialSubmissions.id, submissionId))
      .returning({ id: editorialSubmissions.id, status: editorialSubmissions.status });
    if (!rows.length) throw new Error("Submission not found");
    process.stdout.write(`${JSON.stringify(rows[0])}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
