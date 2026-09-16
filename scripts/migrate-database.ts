#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";
import { z } from "zod";

const databaseUrl = z
  .string()
  .url()
  .regex(/^postgres(?:ql)?:\/\//)
  .parse(process.env.DATABASE_URL);
const directory = path.resolve(process.cwd(), "database/migrations");
const files = readdirSync(directory)
  .filter((file) => /^[0-9][A-Za-z0-9_-]*\.sql$/.test(file))
  .sort();
const sql = postgres(databaseUrl, { max: 1, prepare: false });

async function main() {
  await sql`select pg_advisory_lock(hashtextextended('ai-sre-database-migrations', 0))`;
  try {
    await sql`create schema if not exists app`;
    await sql`create table if not exists app.schema_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
    for (const file of files) {
      const migrationPath = path.join(directory, file);
      const body = readFileSync(migrationPath, "utf8");
      const checksum = createHash("sha256").update(body).digest("hex");
      const [applied] = await sql<
        { checksum: string }[]
      >`select checksum from app.schema_migrations where name = ${file}`;
      if (applied) {
        if (applied.checksum !== checksum)
          throw new Error(`Applied migration changed: ${file}`);
        continue;
      }
      // postgres.js has rejected this multi-statement PL/pgSQL migration with
      // PG08P01 against the real PostgreSQL 16 VM. psql preserves function
      // bodies without parsing them. --single-transaction includes the ledger
      // insert, so a failed migration is never marked as applied.
      const includePath = migrationPath.replace(/'/g, "''");
      const temporaryDirectory = mkdtempSync(
        path.join(tmpdir(), "ai-sre-migration-"),
      );
      const wrapper = path.join(temporaryDirectory, "apply.sql");
      writeFileSync(
        wrapper,
        `\\set ON_ERROR_STOP on\n\\i '${includePath}'\ninsert into app.schema_migrations (name, checksum) values ('${file}', '${checksum}');\n`,
      );
      try {
        const result = spawnSync(
          "psql",
          [
            "--no-psqlrc",
            "--single-transaction",
            "--dbname",
            databaseUrl,
            "--file",
            wrapper,
          ],
          { encoding: "utf8" },
        );
        if (result.error)
          throw new Error(
            `Migration ${file} could not start psql: ${result.error.message}`,
          );
        if (result.status !== 0)
          throw new Error(
            `Migration ${file} failed via psql:\n${result.stderr || result.stdout}`,
          );
      } finally {
        rmSync(temporaryDirectory, { recursive: true, force: true });
      }
      process.stdout.write(`Applied ${file}\n`);
    }
  } finally {
    await sql`select pg_advisory_unlock(hashtextextended('ai-sre-database-migrations', 0))`;
  }
}

void main()
  .catch((error: unknown) => {
    process.exitCode = 1;
    throw error;
  })
  .finally(() => sql.end());
