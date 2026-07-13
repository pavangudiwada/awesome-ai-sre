import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, RssIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllPublishedUpdates } from "@/lib/workflows/queries";

export const metadata: Metadata = {
  title: "Reviewed updates",
  description:
    "Source-linked AI SRE Watchlist changes and reviewed updates from followed companies.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesPage() {
  const updates = await getAllPublishedUpdates();
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-4xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">Watchlist change feed</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Reviewed updates, not vendor-feed noise</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The Bell contains public Watchlist reports and reviewed updates for companies you follow. Opening the Bell changes nothing; selecting an update marks that item read.
        </p>
      </header>

      {updates.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {updates.map((update) => (
            <Card key={update.id}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">Reviewed update</Badge>
                <CardTitle>{update.title}</CardTitle>
                <CardDescription>{update.summary}</CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center justify-between gap-3">
                <time className="text-xs text-muted-foreground" dateTime={update.published_at}>
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(update.published_at))}
                </time>
                <Button asChild variant="link" className="px-0">
                  <Link href={`/updates/${update.slug}`}>Read update</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <BellIcon />
          <AlertTitle>No reviewed updates have been published yet</AlertTitle>
          <AlertDescription>
            The feed intentionally stays empty until an update has sources and editorial review. There are no placeholder unread badges.
          </AlertDescription>
        </Alert>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <RssIcon />
          <CardTitle>How company follows work</CardTitle>
          <CardDescription>
            Follow a company on its profile to prioritize its reviewed updates here. This never reveals saved products, notes, or evaluations to the company.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/tools">Browse products and companies</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
