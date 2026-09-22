import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { getPostgresClient } from "@/db";

const publicHeaderUpdateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  company_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
  title: z.string().min(1),
  summary: z.string(),
  source_url: z.string().url().refine((value) => new URL(value).protocol === "https:").nullable().optional(),
  published_at: z.string().datetime({ offset: true }),
});

export type PublicHeaderUpdate = z.infer<typeof publicHeaderUpdateSchema>;

async function queryPublicHeaderUpdates(): Promise<PublicHeaderUpdate[]> {
  const rows = await getPostgresClient()`
    select id::text as id, slug, company_slug, title, summary, source_url,
      to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as published_at
    from public.published_updates
    where published_at <= now() and retired_at is null
    order by published_at desc
    limit 12
  `;
  return z.array(publicHeaderUpdateSchema).parse(rows);
}

const getCachedPublicHeaderUpdates = unstable_cache(
  queryPublicHeaderUpdates,
  ["public-header-updates-v1"],
  { revalidate: 300, tags: ["published-updates"] },
);

export async function getPublicHeaderUpdates(): Promise<PublicHeaderUpdate[]> {
  return getCachedPublicHeaderUpdates();
}
