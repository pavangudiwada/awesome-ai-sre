#!/usr/bin/env tsx

import postgres from "postgres";
import { z } from "zod";

export async function verifyDatabaseHealth(
  databaseUrl = process.env.DATABASE_URL,
) {
  const parsedDatabaseUrl = z
    .string()
    .url()
    .regex(/^postgres(?:ql)?:\/\//)
    .parse(databaseUrl);
  const sql = postgres(parsedDatabaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
  });
  try {
    const [result] = await sql<{ ready: boolean }[]>`select true as ready`;
    if (!result?.ready)
      throw new Error("PostgreSQL readiness query returned no result");
    process.stdout.write("PostgreSQL server-only readiness query passed.\n");
  } finally {
    await sql.end();
  }
}
if (import.meta.url === new URL(`file://${process.argv[1]}`).href)
  void verifyDatabaseHealth().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
