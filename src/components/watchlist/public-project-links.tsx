"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CodeXmlIcon, StarIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { PROJECT_GITHUB_URL, PROJECT_LINKEDIN_URL } from "@/lib/public-project";

const statsSchema = z.object({
  stars: z.number().int().nonnegative().safe(),
  checkedAt: z.string().datetime({ offset: true }),
});

export function PublicProjectLinks() {
  const [stats, setStats] = useState<z.infer<typeof statsSchema> | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadStars() {
      try {
        const response = await fetch("/api/repository-stats", {
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Repository statistics unavailable");
        const result = statsSchema.parse(await response.json());
        if (!controller.signal.aborted) setStats(result);
      } catch {
        // Keep the repository link useful when GitHub is unreachable or rate-limited.
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void loadStars();
    return () => controller.abort();
  }, []);

  const count = stats ? new Intl.NumberFormat("en-US").format(stats.stars) : null;
  const checkedAt = stats ? new Intl.DateTimeFormat("en", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(stats.checkedAt)) : null;

  return (
    <div className="border-b bg-muted/30">
      <nav
        aria-label="Project community"
        className="mx-auto flex min-h-14 max-w-screen-2xl items-center justify-between gap-2 px-4 sm:justify-end sm:px-6 lg:px-8"
      >
        <Button asChild variant="ghost" className="h-11 gap-2 px-2">
          <a
            href={PROJECT_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={count ? `Open-source project on GitHub, ${count} stars` : "Open-source project on GitHub"}
            title={checkedAt ? `GitHub stars checked ${checkedAt} UTC` : "Open-source repository on GitHub"}
          >
            <CodeXmlIcon aria-hidden="true" />
            <span className="flex flex-col items-start leading-tight">
              <span>GitHub</span>
              <span className="text-xs text-muted-foreground">Open source</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <StarIcon className="size-3.5" aria-hidden="true" />
              {count ?? (pending ? "…" : "View stars")}
            </span>
          </a>
        </Button>
        <Button asChild variant="ghost" className="h-11 gap-2 px-2">
          <a href={PROJECT_LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow AI SRE Watchlist on LinkedIn">
            <Image src="/icons/linkedin.svg" width={16} height={16} alt="" aria-hidden="true" />
            LinkedIn
          </a>
        </Button>
      </nav>
    </div>
  );
}
