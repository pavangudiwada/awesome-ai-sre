#!/usr/bin/env tsx

import { verifyDatabaseHealth } from "./check-database-health";

void verifyDatabaseHealth().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
