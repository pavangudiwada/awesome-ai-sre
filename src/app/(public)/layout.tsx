import type { ReactNode } from "react";
import Link from "next/link";

import { markUpdateReadAction } from "@/actions/workflows";
import { SiteHeader } from "@/components/watchlist";
import { getHeaderState } from "@/lib/presentation/header";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { viewer, notifications } = await getHeaderState();

  return (
    <>
      <SiteHeader
        viewer={viewer}
        notifications={notifications}
        markNotificationReadAction={markUpdateReadAction}
      />
      {children}
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div className="flex max-w-xl flex-col gap-2">
            <p className="font-medium">AI SRE Watchlist</p>
            <p className="text-muted-foreground">
              Evidence-led research and private evaluation workflows for reliability teams.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="Footer">
            <Link href="/methodology" className="hover:underline">Methodology</Link>
            <Link href="/editorial-policy" className="hover:underline">Editorial policy</Link>
            <Link href="/submit/correction" className="hover:underline">Submit a correction</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
