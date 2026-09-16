import { NextResponse } from "next/server";

import { getPostgresClient } from "@/db";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ready: false }, { status: 503, headers });
  }
  try {
    const sql = getPostgresClient();
    const ready = await sql.begin(async (transaction) => {
      await transaction`set local statement_timeout = '3s'`;
      const [state] = await transaction<{ ready: boolean }[]>`
        select
          to_regclass('auth.user') is not null
          and to_regclass('auth.session') is not null
          and to_regclass('public.saved_products') is not null
          and to_regclass('public.evaluations') is not null
          and to_regclass('private.analytics_events') is not null
          and to_regclass('private.auth_magic_link_rate_limits') is not null
          and to_regclass('app.schema_migrations') is not null as ready
      `;
      return state?.ready === true;
    });
    if (!ready) throw new Error("database is not ready");
    return NextResponse.json({ ready: true }, { headers });
  } catch {
    return NextResponse.json({ ready: false }, { status: 503, headers });
  }
}
