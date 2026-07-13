import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublishedContentDocuments } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "AI SRE resources",
  description:
    "Practical scorecards, checklists, and guides for evaluating AI incident-response products.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  const resources = getPublishedContentDocuments("resource");
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-4xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">Practitioner library</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Evaluate AI incident-response tools with a repeatable process
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Owned Watchlist resources for security review, historical replay, pilot scoring, and decision discipline.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.metadata.slug}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">
                  {resource.metadata.kind === "resource"
                    ? resource.metadata.resourceType
                    : "resource"}
                </Badge>
                <BookOpenIcon className="text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle>{resource.metadata.title}</CardTitle>
              <CardDescription>{resource.metadata.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button asChild variant="link" className="px-0">
                <Link href={`/resources/${resource.metadata.slug}`}>
                  Read resource
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
