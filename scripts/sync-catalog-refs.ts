#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { catalogCompanyRefs, catalogProductRefs } from "../src/db/schema";
import {
  getCompanies,
  getObservabilityProducts,
  getProducts,
} from "../src/lib/catalog";
import { observabilityWorkflowSlug } from "../src/lib/presentation/catalog";

const environmentSchema = z.object({ DATABASE_URL: z.string().url() });

interface CompanySyncRow {
  slug: string;
  name: string;
  website_domain: string;
}

interface ProductSyncRow {
  slug: string;
  name: string;
  url: string;
  company_slug: string | null;
  yaml_hash: string;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceHash(sourceFile: string) {
  return sha256(readFileSync(path.resolve(process.cwd(), sourceFile), "utf8"));
}

function jsonSqlLiteral(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

export function buildLinkedCatalogSyncSql(
  companies: CompanySyncRow[],
  products: ProductSyncRow[],
) {
  return `
begin;

update public.catalog_product_refs
set is_active = false, last_synced_at = now();

update public.catalog_company_refs
set is_active = false, last_synced_at = now();

with incoming as (
  select *
  from jsonb_to_recordset(${jsonSqlLiteral(companies)}) as row(
    slug text,
    name text,
    website_domain text
  )
)
insert into public.catalog_company_refs (
  slug,
  name,
  website_domain,
  is_active,
  last_synced_at
)
select slug, name, website_domain, true, now()
from incoming
on conflict (slug) do update
set name = excluded.name,
    website_domain = excluded.website_domain,
    is_active = true,
    last_synced_at = now();

with incoming as (
  select *
  from jsonb_to_recordset(${jsonSqlLiteral(products)}) as row(
    slug text,
    name text,
    url text,
    company_slug text,
    yaml_hash text
  )
)
insert into public.catalog_product_refs (
  slug,
  name,
  url,
  company_slug,
  is_active,
  yaml_hash,
  last_synced_at
)
select slug, name, url, company_slug, true, yaml_hash, now()
from incoming
on conflict (slug) do update
set name = excluded.name,
    url = excluded.url,
    company_slug = excluded.company_slug,
    is_active = true,
    yaml_hash = excluded.yaml_hash,
    last_synced_at = now();

commit;

select
  (select count(*)::int from public.catalog_company_refs where is_active) as active_companies,
  (select count(*)::int from public.catalog_product_refs where is_active) as active_products,
  (select count(*)::int from public.catalog_product_refs where is_active and slug like 'obs-%') as active_observability_products;
`;
}

async function main() {
  const companies = getCompanies();
  const products = getProducts();
  const observability = getObservabilityProducts();
  const dryRun = process.argv.includes("--dry-run");
  const linked = process.argv.includes("--linked");
  const companyRows: CompanySyncRow[] = companies.map((company) => ({
    slug: company.slug,
    name: company.name,
    website_domain: new URL(company.website).hostname.replace(/^www\./, ""),
  }));
  const productRows: ProductSyncRow[] = [
    ...products.map((product) => ({
      slug: product.slug,
      name: product.name,
      url: product.url,
      company_slug: product.companySlug ?? null,
      yaml_hash: sourceHash(product.sourceFile),
    })),
    ...observability.map((product) => ({
      slug: observabilityWorkflowSlug(product.slug),
      name: product.name,
      url: product.url,
      company_slug: null,
      yaml_hash: sha256(JSON.stringify(product)),
    })),
  ];

  if (dryRun) {
    process.stdout.write(
      `Catalog sync dry run: ${companies.length} companies, ${products.length + observability.length} products (${observability.length} observability keys use obs- prefix).\n`,
    );
    return;
  }

  if (linked) {
    const supabaseCli = path.resolve(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "supabase.cmd" : "supabase",
    );
    const result = spawnSync(
      supabaseCli,
      [
        "--output",
        "table",
        "db",
        "query",
        "--linked",
        buildLinkedCatalogSyncSql(companyRows, productRows),
      ],
      { stdio: "inherit" },
    );

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Linked catalog sync failed with exit code ${result.status}`);
    }
    return;
  }

  const { DATABASE_URL } = environmentSchema.parse(process.env);
  const client = postgres(DATABASE_URL, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    await db.transaction(async (tx) => {
      const syncedAt = new Date();
      await tx
        .update(catalogProductRefs)
        .set({ isActive: false, lastSyncedAt: syncedAt });
      await tx
        .update(catalogCompanyRefs)
        .set({ isActive: false, lastSyncedAt: syncedAt });

      for (const company of companyRows) {
        await tx
          .insert(catalogCompanyRefs)
          .values({
            slug: company.slug,
            name: company.name,
            websiteDomain: company.website_domain,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: catalogCompanyRefs.slug,
            set: {
              name: company.name,
              websiteDomain: company.website_domain,
              isActive: true,
              lastSyncedAt: syncedAt,
            },
          });
      }

      for (const product of productRows) {
        await tx
          .insert(catalogProductRefs)
          .values({
            slug: product.slug,
            name: product.name,
            url: product.url,
            companySlug: product.company_slug,
            isActive: true,
            yamlHash: product.yaml_hash,
          })
          .onConflictDoUpdate({
            target: catalogProductRefs.slug,
            set: {
              name: product.name,
              url: product.url,
              companySlug: product.company_slug,
              isActive: true,
              yamlHash: product.yaml_hash,
              lastSyncedAt: syncedAt,
            },
          });
      }
    });
    process.stdout.write(
      `Synced ${companies.length} companies and ${products.length + observability.length} products.\n`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
