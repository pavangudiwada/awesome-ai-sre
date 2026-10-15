import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon, CircleAlertIcon, NewspaperIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { groupPublicNews, type NewsFeedItem } from "@/lib/news/feed";
import { getPublicNewsFeed } from "@/lib/news/public-feed";
import { publicPageMetadata } from "@/lib/seo";

// Public publications are read at request time, without an authenticated session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: "Global Updates",
  description: "Source-linked funding, launches, and product news across the AI SRE ecosystem. Public to everyone, independently of company follows.",
  path: "/updates",
});

function NewsDate({ value }: { value: string }) {
  return <time dateTime={value}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value))}</time>;
}

function NewsCard({ item }: { item: NewsFeedItem }) {
  return (
    <Card className="h-full min-w-0 scroll-mt-36" id={item.slug}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{item.category}</Badge>
          {item.company ? <span className="text-sm text-muted-foreground">{item.company}</span> : null}
        </div>
        <CardTitle><h4 className="text-lg leading-snug">{item.title}</h4></CardTitle>
        <CardDescription className="text-sm leading-relaxed">{item.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <dl className="grid gap-2 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{item.announcedAt ? "Announced" : "Watchlist published"}</dt>
            <dd><NewsDate value={item.announcedAt ?? item.publishedAt!} /></dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">Actual event date</dt>
            <dd>{item.eventDate ? <NewsDate value={item.eventDate} /> : "Unknown"}</dd>
          </div>
          {item.availability ? (
            <div className="flex flex-col gap-1">
              <dt className="font-medium">Availability / stage</dt>
              <dd className="text-muted-foreground">{item.availability}</dd>
            </div>
          ) : null}
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">{item.dateNote}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {item.sources.map((source) => (
          <Button key={source.url} asChild variant="outline" className="min-h-11 max-w-full whitespace-normal text-left">
            <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} for ${item.title} (opens in a new tab)`}>
              {source.label}<ArrowUpRightIcon aria-hidden="true" />
            </a>
          </Button>
        ))}
        {item.articlePath ? <Button asChild variant="link" className="min-h-11"><Link href={item.articlePath}>Read Watchlist update</Link></Button> : null}
      </CardFooter>
    </Card>
  );
}

export default async function UpdatesPage() {
  const feed = await getPublicNewsFeed();
  const years = groupPublicNews(feed.items);
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-4xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">Across the AI SRE ecosystem</p>
        <h1 className="font-semibold text-title sm:text-title-desktop">Global Updates</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Funding, launches, and product changes, with dates and original sources. Everyone sees the same public news, whether or not they follow a company.
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Grouped by announcement date, newest first. Actual event dates are marked Unknown when not established. Watchlist reports use their own publication date. This is a curated selection, not an exhaustive news archive.
        </p>
        <p className="text-sm text-muted-foreground">
          {feed.items.length ? `${feed.items.length} source-linked ${feed.items.length === 1 ? "update" : "updates"} shown` : feed.publicationStatus === "available" ? "No reviewed updates yet" : "Additional publications could not be checked"} · No sign-in required
        </p>
      </header>

      {feed.publicationStatus !== "available" ? (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{feed.publicationStatus === "unavailable" ? "Additional Watchlist publications are temporarily unavailable" : "Some Watchlist publications could not be loaded"}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{feed.items.length ? "The source-linked news below remains available. " : ""}The publication service could not return a complete result; this does not mean there are no updates.</p>
            <form action="/updates" method="get"><Button type="submit" variant="outline" className="min-h-11">Try again</Button></form>
          </AlertDescription>
        </Alert>
      ) : null}

      {years.length ? (
        <>
          <nav aria-label="Jump to news year" className="flex flex-wrap gap-2">
            {years.map(({ year }) => <Button key={year} asChild variant="outline" className="min-h-11"><a href={`#updates-${year}`}>{year}</a></Button>)}
          </nav>
          {years.map(({ year, months }) => (
            <section key={year} id={`updates-${year}`} aria-labelledby={`heading-${year}`} className="flex scroll-mt-36 flex-col gap-6">
              <h2 id={`heading-${year}`} className="text-3xl font-semibold tracking-tight">{year}</h2>
              {months.map((month) => (
                <section key={month.key} aria-labelledby={`heading-${month.key}`} className="flex flex-col gap-4">
                  <h3 id={`heading-${month.key}`} className="text-xl font-medium">{month.label} <span className="text-sm font-normal text-muted-foreground">· {month.items.length}</span></h3>
                  <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {month.items.map((item) => <NewsCard key={item.id} item={item} />)}
                  </div>
                </section>
              ))}
            </section>
          ))}
        </>
      ) : feed.publicationStatus === "available" ? (
        <Alert>
          <NewspaperIcon aria-hidden="true" />
          <AlertTitle>No reviewed news is available yet</AlertTitle>
          <AlertDescription>Source-linked funding and product news will appear here after review.</AlertDescription>
        </Alert>
      ) : null}
    </main>
  );
}
