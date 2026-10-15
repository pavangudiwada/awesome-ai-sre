import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

const repositorySchema = z.object({
  full_name: z.literal("pavangudiwada/awesome-ai-sre"),
  stargazers_count: z.number().int().nonnegative().safe(),
});

export interface RepositoryStats {
  stars: number;
  checkedAt: string;
}

// Failed refreshes throw rather than replacing a previously cached count with zero.
// Next's persistent data cache retains the last successful result on revalidation failure.
const getCachedRepositoryStats = unstable_cache(
  async (): Promise<RepositoryStats> => {
    const response = await fetch(
      "https://api.github.com/repos/pavangudiwada/awesome-ai-sre",
      {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) throw new Error("Public repository statistics unavailable");
    const repository = repositorySchema.parse(await response.json());
    return { stars: repository.stargazers_count, checkedAt: new Date().toISOString() };
  },
  ["watchlist-public-github-stars-v1"],
  { revalidate: 3_600 },
);

export async function getRepositoryStats(): Promise<RepositoryStats | null> {
  try {
    return await getCachedRepositoryStats();
  } catch {
    return null;
  }
}
