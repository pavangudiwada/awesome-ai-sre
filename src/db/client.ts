import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import * as schema from "./schema";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .regex(/^postgres(?:ql)?:\/\//, "Use a PostgreSQL connection URL"),
});

type SqlClient = ReturnType<typeof postgres>;
export type WatchlistDatabase = PostgresJsDatabase<typeof schema>;

type DatabaseSingleton = {
  client: SqlClient;
  db: WatchlistDatabase;
};

const globalForDatabase = globalThis as typeof globalThis & {
  __aiSreWatchlistDatabase?: DatabaseSingleton;
};

function createDatabaseSingleton(): DatabaseSingleton {
  const environment = databaseEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  // Supabase's transaction pooler does not support prepared statements.
  const client = postgres(environment.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client, { schema });

  return { client, db };
}

function getDatabaseSingleton(): DatabaseSingleton {
  globalForDatabase.__aiSreWatchlistDatabase ??= createDatabaseSingleton();
  return globalForDatabase.__aiSreWatchlistDatabase;
}

/** Lazily opens the server-only Drizzle connection on first use. */
export function getDatabase(): WatchlistDatabase {
  return getDatabaseSingleton().db;
}

/** Escape hatch for transactional/operator SQL that Drizzle does not model. */
export function getPostgresClient(): SqlClient {
  return getDatabaseSingleton().client;
}

export async function closeDatabaseConnection(): Promise<void> {
  const singleton = globalForDatabase.__aiSreWatchlistDatabase;
  if (!singleton) return;

  await singleton.client.end();
  delete globalForDatabase.__aiSreWatchlistDatabase;
}
