#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
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

export interface CompanySyncRow {
  slug: string;
  name: string;
  website_domain: string;
}

export interface ProductSyncRow {
  slug: string;
  name: string;
  url: string;
  company_slug: string | null;
  yaml_hash: string;
}

export interface CatalogSyncPlan {
  readonly companies: readonly CompanySyncRow[];
  readonly products: readonly ProductSyncRow[];
}

export interface CatalogReferenceSnapshot {
  readonly companySlugs: readonly string[];
  readonly products: readonly {
    readonly slug: string;
    readonly yamlHash: string | null;
  }[];
}

export interface CatalogReferenceParity {
  readonly matches: boolean;
  readonly missingCompanySlugs: readonly string[];
  readonly unexpectedCompanySlugs: readonly string[];
  readonly missingProductSlugs: readonly string[];
  readonly unexpectedProductSlugs: readonly string[];
  readonly staleProductSlugs: readonly string[];
}

export interface CatalogReferenceCompatibility {
  readonly matches: boolean;
  readonly missingCompanySlugs: readonly string[];
  readonly missingProductSlugs: readonly string[];
  readonly staleProductSlugs: readonly string[];
}

export const PRODUCTION_SYNC_CONFIRMATION = "SYNC_CATALOG_REFS";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceHash(sourceFile: string) {
  return sha256(readFileSync(path.resolve(process.cwd(), sourceFile), "utf8"));
}

function setDifference(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return [...left]
    .filter((value) => !right.has(value))
    .sort((first, second) => first.localeCompare(second));
}

export function compareCatalogReferenceParity(
  plan: CatalogSyncPlan,
  actual: CatalogReferenceSnapshot,
): CatalogReferenceParity {
  const expectedCompanySlugs = new Set(plan.companies.map((row) => row.slug));
  const actualCompanySlugs = new Set(actual.companySlugs);
  const expectedProductBySlug = new Map(
    plan.products.map((row) => [row.slug, row] as const),
  );
  const actualProductBySlug = new Map(
    actual.products.map((row) => [row.slug, row] as const),
  );
  const expectedProductSlugs = new Set(expectedProductBySlug.keys());
  const actualProductSlugs = new Set(actualProductBySlug.keys());
  const missingCompanySlugs = setDifference(
    expectedCompanySlugs,
    actualCompanySlugs,
  );
  const unexpectedCompanySlugs = setDifference(
    actualCompanySlugs,
    expectedCompanySlugs,
  );
  const missingProductSlugs = setDifference(
    expectedProductSlugs,
    actualProductSlugs,
  );
  const unexpectedProductSlugs = setDifference(
    actualProductSlugs,
    expectedProductSlugs,
  );
  const staleProductSlugs = [...expectedProductBySlug]
    .filter(([slug, expected]) => {
      const row = actualProductBySlug.get(slug);
      return row !== undefined && row.yamlHash !== expected.yaml_hash;
    })
    .map(([slug]) => slug)
    .sort((first, second) => first.localeCompare(second));

  return {
    matches:
      missingCompanySlugs.length === 0 &&
      unexpectedCompanySlugs.length === 0 &&
      missingProductSlugs.length === 0 &&
      unexpectedProductSlugs.length === 0 &&
      staleProductSlugs.length === 0,
    missingCompanySlugs,
    unexpectedCompanySlugs,
    missingProductSlugs,
    unexpectedProductSlugs,
    staleProductSlugs,
  };
}

export function formatCatalogReferenceParity(
  parity: CatalogReferenceParity,
): string {
  if (parity.matches) return "Catalog reference parity verified.";

  const differences = [
    ["missing companies", parity.missingCompanySlugs],
    ["unexpected companies", parity.unexpectedCompanySlugs],
    ["missing products", parity.missingProductSlugs],
    ["unexpected products", parity.unexpectedProductSlugs],
    ["stale product hashes", parity.staleProductSlugs],
  ] as const;

  return differences
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => `${label}: ${values.join(", ")}`)
    .join("\n");
}

export function compareCatalogReferenceCompatibility(
  plan: CatalogSyncPlan,
  actual: CatalogReferenceSnapshot,
): CatalogReferenceCompatibility {
  const parity = compareCatalogReferenceParity(plan, actual);
  return {
    matches:
      parity.missingCompanySlugs.length === 0 &&
      parity.missingProductSlugs.length === 0 &&
      parity.staleProductSlugs.length === 0,
    missingCompanySlugs: parity.missingCompanySlugs,
    missingProductSlugs: parity.missingProductSlugs,
    staleProductSlugs: parity.staleProductSlugs,
  };
}

export function formatCatalogReferenceCompatibility(
  compatibility: CatalogReferenceCompatibility,
): string {
  if (compatibility.matches) {
    return "Catalog references are backward-compatible with the staged release.";
  }

  return ([
    ["missing companies", compatibility.missingCompanySlugs],
    ["missing products", compatibility.missingProductSlugs],
    ["stale product hashes", compatibility.staleProductSlugs],
  ] as const)
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => `${label}: ${values.join(", ")}`)
    .join("\n");
}

export function buildCatalogSyncPlan(): CatalogSyncPlan {
  const companies = getCompanies();
  const products = getProducts();
  const observability = getObservabilityProducts();

  return {
    companies: companies.map((company) => ({
      slug: company.slug,
      name: company.name,
      website_domain: new URL(company.website).hostname.replace(/^www\./, ""),
    })),
    products: [
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
    ],
  };
}

function jsonSqlLiteral(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

export function buildLinkedCatalogSyncSql(
  companies: readonly CompanySyncRow[],
  products: readonly ProductSyncRow[],
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

do \$catalog_parity\$
begin
  if exists (
    select slug from public.catalog_company_refs where is_active
    except
    select slug from jsonb_to_recordset(${jsonSqlLiteral(companies)}) as row(slug text)
  ) or exists (
    select slug from jsonb_to_recordset(${jsonSqlLiteral(companies)}) as row(slug text)
    except
    select slug from public.catalog_company_refs where is_active
  ) then
    raise exception 'Active catalog company reference slugs do not match file-backed catalog';
  end if;

  if exists (
    select slug from public.catalog_product_refs where is_active
    except
    select slug from jsonb_to_recordset(${jsonSqlLiteral(products)}) as row(slug text)
  ) or exists (
    select slug from jsonb_to_recordset(${jsonSqlLiteral(products)}) as row(slug text)
    except
    select slug from public.catalog_product_refs where is_active
  ) or exists (
    select 1
    from public.catalog_product_refs as actual
    join jsonb_to_recordset(${jsonSqlLiteral(products)}) as expected(
      slug text,
      yaml_hash text
    ) on expected.slug = actual.slug
    where actual.is_active
      and actual.yaml_hash is distinct from expected.yaml_hash
  ) then
    raise exception 'Active catalog product references do not match file-backed catalog';
  end if;
end
\$catalog_parity\$;

commit;

select
  (select count(*)::int from public.catalog_company_refs where is_active) as active_companies,
  (select count(*)::int from public.catalog_product_refs where is_active) as active_products,
  (select count(*)::int from public.catalog_product_refs where is_active and slug like 'obs-%') as active_observability_products;
`;
}

export function buildLinkedCatalogPrepareSql(
  companies: readonly CompanySyncRow[],
  products: readonly ProductSyncRow[],
) {
  return `
begin;

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

do \$catalog_compatibility\$
begin
  if exists (
    select slug from jsonb_to_recordset(${jsonSqlLiteral(companies)}) as row(slug text)
    except
    select slug from public.catalog_company_refs where is_active
  ) then
    raise exception 'Staged catalog company references are incomplete';
  end if;

  if exists (
    select slug from jsonb_to_recordset(${jsonSqlLiteral(products)}) as row(slug text)
    except
    select slug from public.catalog_product_refs where is_active
  ) or exists (
    select 1
    from jsonb_to_recordset(${jsonSqlLiteral(products)}) as expected(
      slug text,
      yaml_hash text
    )
    join public.catalog_product_refs as actual on actual.slug = expected.slug
    where not actual.is_active
      or actual.yaml_hash is distinct from expected.yaml_hash
  ) then
    raise exception 'Staged catalog product references are incomplete or stale';
  end if;
end
\$catalog_compatibility\$;

commit;
`;
}

async function main() {
  const plan = buildCatalogSyncPlan();
  const apply = process.argv.includes("--apply");
  const prepare = process.argv.includes("--prepare");
  const verify = process.argv.includes("--verify");
  const linked = process.argv.includes("--linked");
  const production = process.argv.includes("--production");
  const confirmationArgument = process.argv.find((argument) =>
    argument.startsWith("--confirm-production-sync="),
  );
  const confirmation =
    confirmationArgument?.split("=", 2)[1] ??
    process.env.CATALOG_SYNC_CONFIRMATION;

  if ([apply, prepare, verify].filter(Boolean).length > 1) {
    throw new Error("Use only one of --prepare, --apply, or --verify");
  }
  if (linked && !apply && !prepare) {
    throw new Error("--linked is only valid with explicit --prepare or --apply mode");
  }
  if (
    (production || linked) &&
    (apply || prepare) &&
    confirmation !== PRODUCTION_SYNC_CONFIRMATION
  ) {
    throw new Error(
      `Hosted catalog sync requires --confirm-production-sync=${PRODUCTION_SYNC_CONFIRMATION}`,
    );
  }

  if (!apply && !prepare && !verify) {
    process.stdout.write(
      `Catalog sync plan: ${plan.companies.length} companies and ${plan.products.length} products. No database changes; pass --apply explicitly.\n`,
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
        prepare
          ? buildLinkedCatalogPrepareSql(plan.companies, plan.products)
          : buildLinkedCatalogSyncSql(plan.companies, plan.products),
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
    if (verify) {
      const [activeCompanies, activeProducts] = await Promise.all([
        db
          .select({ slug: catalogCompanyRefs.slug })
          .from(catalogCompanyRefs)
          .where(eq(catalogCompanyRefs.isActive, true)),
        db
          .select({
            slug: catalogProductRefs.slug,
            yamlHash: catalogProductRefs.yamlHash,
          })
          .from(catalogProductRefs)
          .where(eq(catalogProductRefs.isActive, true)),
      ]);
      const parity = compareCatalogReferenceParity(plan, {
        companySlugs: activeCompanies.map((row) => row.slug),
        products: activeProducts,
      });
      if (!parity.matches) {
        throw new Error(formatCatalogReferenceParity(parity));
      }
      process.stdout.write(`${formatCatalogReferenceParity(parity)}\n`);
      return;
    }

    const result = await db.transaction(async (tx) => {
      const syncedAt = new Date();
      if (apply) {
        await tx
          .update(catalogProductRefs)
          .set({ isActive: false, lastSyncedAt: syncedAt });
        await tx
          .update(catalogCompanyRefs)
          .set({ isActive: false, lastSyncedAt: syncedAt });
      }

      for (const company of plan.companies) {
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

      for (const product of plan.products) {
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

      const [activeCompanies, activeProducts] = await Promise.all([
        tx
          .select({ slug: catalogCompanyRefs.slug })
          .from(catalogCompanyRefs)
          .where(eq(catalogCompanyRefs.isActive, true)),
        tx
          .select({
            slug: catalogProductRefs.slug,
            yamlHash: catalogProductRefs.yamlHash,
          })
          .from(catalogProductRefs)
          .where(eq(catalogProductRefs.isActive, true)),
      ]);
      const snapshot = {
        companySlugs: activeCompanies.map((row) => row.slug),
        products: activeProducts,
      };
      if (prepare) {
        const compatibility = compareCatalogReferenceCompatibility(plan, snapshot);
        if (!compatibility.matches) {
          throw new Error(formatCatalogReferenceCompatibility(compatibility));
        }
        return formatCatalogReferenceCompatibility(compatibility);
      }

      const transactionParity = compareCatalogReferenceParity(plan, snapshot);
      if (!transactionParity.matches) {
        throw new Error(formatCatalogReferenceParity(transactionParity));
      }
      return formatCatalogReferenceParity(transactionParity);
    });
    const operation = prepare ? "Prepared" : "Finalized";
    process.stdout.write(
      `${operation} ${plan.companies.length} companies and ${plan.products.length} products transactionally. ${result}\n`,
    );
  } finally {
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
