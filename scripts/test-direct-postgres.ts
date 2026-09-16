#!/usr/bin/env tsx

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { z } from "zod";

function requireLocalTestDatabase(value: string) {
  const url = z
    .string()
    .url()
    .regex(/^postgres(?:ql)?:\/\//)
    .parse(value);
  const parsed = new URL(url);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!loopbackHosts.has(parsed.hostname) || parsed.pathname !== "/ai_sre_test") {
    throw new Error("TEST_DATABASE_URL must target local ai_sre_test exactly");
  }
  return url;
}

async function main() {
  const url = requireLocalTestDatabase(process.env.TEST_DATABASE_URL ?? "");
  const migration = spawnSync("npx", ["tsx", "scripts/migrate-database.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  if (migration.status !== 0) throw new Error("test database bootstrap failed");

  process.env.DATABASE_URL = url;
  const sql = postgres(url, { max: 1, prepare: false });
  const { closeDatabaseConnection } = await import("../src/db");
  const { workflowStore } = await import("../src/lib/workflows/store");
  const owner = randomUUID(),
    other = randomUUID();
  const productA = `test-product-${randomUUID().slice(0, 8)}`,
    productB = `test-product-${randomUUID().slice(0, 8)}`,
    company = `test-company-${randomUUID().slice(0, 8)}`;
  try {
    await sql`insert into auth."user" (id, name, email) values (${owner}::uuid, 'Owner', ${`owner-${owner}@example.test`}), (${other}::uuid, 'Other', ${`other-${other}@example.test`})`;
    await sql`insert into public.catalog_company_refs (slug, name) values (${company}, 'Test company')`;
    await sql`insert into public.catalog_product_refs (slug, name, company_slug) values (${productA}, 'Test product A', ${company}), (${productB}, 'Test product B', ${company})`;
    const store = workflowStore();
    const input = {
      name: "Owned evaluation",
      goal: "",
      requirements: "",
      risks: "",
      decision: "undecided" as const,
    };
    const beforeFailedCreate = await sql<
      { count: string }[]
    >`select count(*)::text as count from public.evaluations where practitioner_id = ${owner}::uuid`;
    try {
      await store.createEvaluation(owner, input, `missing-${randomUUID()}`);
      throw new Error("creation with a missing catalog product succeeded");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "creation with a missing catalog product succeeded"
      )
        throw error;
    }
    const afterFailedCreate = await sql<
      { count: string }[]
    >`select count(*)::text as count from public.evaluations where practitioner_id = ${owner}::uuid`;
    if (beforeFailedCreate[0]?.count !== afterFailedCreate[0]?.count)
      throw new Error("failed evaluation creation was not rolled back");
    const evaluation = await store.createEvaluation(owner, input);
    if (
      await store.updateEvaluation(other, evaluation, {
        ...input,
        name: "Hijacked",
      })
    )
      throw new Error("cross-user evaluation update succeeded");
    if (await store.deleteEvaluation(other, evaluation))
      throw new Error("cross-user evaluation delete succeeded");
    if (await store.addEvaluationProduct(other, evaluation, productA))
      throw new Error("cross-user candidate add succeeded");
    await Promise.all([
      store.addEvaluationProduct(owner, evaluation, productA),
      store.addEvaluationProduct(owner, evaluation, productB),
    ]);
    const candidates = await sql<
      { position: number }[]
    >`select position from public.evaluation_products where evaluation_id = ${evaluation}::uuid order by position`;
    if (
      candidates.length !== 2 ||
      candidates[0]?.position !== 0 ||
      candidates[1]?.position !== 1
    )
      throw new Error("candidate positions were not serialized");
    await store.upsertNote(owner, productA, "private owner note");
    await store.saveProduct(owner, productA, true);
    await store.followCompany(owner, company, true);
    await store.updateProfile(owner, {
      displayName: "Owner",
      role: "SRE",
      organization: "Test",
    });
    for (let i = 0; i < 49; i += 1)
      await store.createEvaluation(owner, { ...input, name: `Quota ${i}` });
    let quotaHit = false;
    try {
      await store.createEvaluation(owner, { ...input, name: "Over quota" });
    } catch {
      quotaHit = true;
    }
    if (!quotaHit) throw new Error("evaluation quota was not enforced");
  } finally {
    try {
      await sql`delete from auth."user" where id = ${owner}::uuid or id = ${other}::uuid`;
      await sql`delete from public.catalog_product_refs where slug = ${productA} or slug = ${productB}`;
      await sql`delete from public.catalog_company_refs where slug = ${company}`;
    } finally {
      await closeDatabaseConnection();
      await sql.end();
    }
  }
  process.stdout.write(
    "Direct PostgreSQL ownership, serialization, quota, and cleanup checks passed.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
