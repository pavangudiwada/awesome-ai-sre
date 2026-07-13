"use client";

import { useEffect } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70svh] max-w-3xl items-center px-4 py-12">
      <Empty className="w-full border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><CircleAlertIcon /></EmptyMedia>
          <EmptyTitle>This page could not be loaded</EmptyTitle>
          <EmptyDescription>Your private work was not changed. Try the request again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button onClick={reset}>Try again</Button></EmptyContent>
      </Empty>
    </main>
  );
}
