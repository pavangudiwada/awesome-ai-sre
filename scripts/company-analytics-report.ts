import { pathToFileURL } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { z } from "zod";

export const MINIMUM_UNIQUE_DAILY_HASH_ACTORS = 10;

const environmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .regex(/^postgres(?:ql)?:\/\//, "Use a PostgreSQL connection URL"),
});

const rawRowSchema = z.object({
  companySlug: z.string(),
  companyName: z.string(),
  profileViews: z.coerce.number().int().nonnegative(),
  outboundClicks: z.coerce.number().int().nonnegative(),
  updateViews: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative(),
  uniqueDailyHashActors: z.coerce.number().int().nonnegative(),
  followerCount: z.coerce.number().int().nonnegative().nullable(),
});

export type CompanyAnalyticsRow = z.infer<typeof rawRowSchema>;

export function suppressUnsafeRows(rows: unknown[]): CompanyAnalyticsRow[] {
  return rows
    .map((row) => rawRowSchema.parse(row))
    .filter(
      (row) =>
        row.uniqueDailyHashActors >= MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
    );
}

function parseDays(arguments_: string[]): number {
  const daysFlagIndex = arguments_.indexOf("--days");
  if (daysFlagIndex === -1) return 30;

  const value = arguments_[daysFlagIndex + 1];
  return z.coerce.number().int().min(1).max(366).parse(value);
}

function dateRange(days: number, now = new Date()) {
  const end = utcDate(now);
  const startDate = new Date(`${end}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

  return { start: utcDate(startDate), end };
}

function utcDate(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid report date");
  return date.toISOString().slice(0, 10);
}

export async function generateCompanyAnalyticsReport(
  arguments_ = process.argv.slice(2),
) {
  const { DATABASE_URL } = environmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
  const days = parseDays(arguments_);
  const period = dateRange(days);

  // This script uses a short-lived, lazy operator connection. Supabase's
  // transaction pooler requires prepared statements to remain disabled.
  const client = postgres(DATABASE_URL, { max: 1, prepare: false });
  const database = drizzle(client);

  try {
    const rows = await database.execute(sql`
      with mapped_events as (
        select
          case
            when event.subject_kind = 'company' then event.subject_slug
            when event.subject_kind = 'product' then product.company_slug
            when event.subject_kind = 'update' then coalesce(
              published_update.company_slug,
              update_product.company_slug
            )
          end as company_slug,
          event.event_type,
          event.visitor_day_hash
        from private.analytics_events as event
        left join public.catalog_product_refs as product
          on event.subject_kind = 'product'
          and product.slug = event.subject_slug
        left join public.published_updates as published_update
          on event.subject_kind = 'update'
          and published_update.slug = event.subject_slug
        left join public.catalog_product_refs as update_product
          on update_product.slug = published_update.product_slug
        where event.occurred_on between ${period.start}::date and ${period.end}::date
      ),
      reportable_engagement as (
        select
          company_slug,
          count(*) filter (where event_type = 'profile_view')::integer
            as "profileViews",
          count(*) filter (where event_type = 'outbound_click')::integer
            as "outboundClicks",
          count(*) filter (where event_type = 'update_view')::integer
            as "updateViews",
          count(*) filter (where event_type = 'share')::integer
            as "shares",
          count(distinct visitor_day_hash)::integer
            as "uniqueDailyHashActors"
        from mapped_events
        where company_slug is not null
        group by company_slug
        having count(distinct visitor_day_hash) >= ${MINIMUM_UNIQUE_DAILY_HASH_ACTORS}
      ),
      follow_counts as (
        select company_slug, count(*)::integer as "followerCount"
        from public.company_follows
        group by company_slug
      )
      select
        company.slug as "companySlug",
        company.name as "companyName",
        engagement."profileViews",
        engagement."outboundClicks",
        engagement."updateViews",
        engagement."shares",
        engagement."uniqueDailyHashActors",
        case
          when coalesce(follows."followerCount", 0) >= ${MINIMUM_UNIQUE_DAILY_HASH_ACTORS}
            then follows."followerCount"
          else null
        end as "followerCount"
      from reportable_engagement as engagement
      join public.catalog_company_refs as company
        on company.slug = engagement.company_slug
        and company.is_active = true
      left join follow_counts as follows
        on follows.company_slug = engagement.company_slug
      order by engagement."uniqueDailyHashActors" desc, company.name asc
    `);

    return {
      generatedAt: new Date().toISOString(),
      period,
      minimumUniqueDailyHashActors: MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
      companies: suppressUnsafeRows(Array.from(rows)),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const report = await generateCompanyAnalyticsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Company analytics report failed: ${message}\n`);
    process.exitCode = 1;
  });
}
