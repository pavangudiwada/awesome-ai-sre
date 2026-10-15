import { NextResponse } from "next/server";

import { getRepositoryStats } from "@/lib/presentation/repository-stats";

export async function GET() {
  const stats = await getRepositoryStats();
  if (!stats) {
    return NextResponse.json(
      { error: "GitHub stars are temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
