import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-3xl items-center px-4 py-12">
      <Empty className="w-full border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchXIcon /></EmptyMedia>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>The profile or resource may have moved, or it has not been published.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button asChild><Link href="/tools">Browse tools</Link></Button>
          <Button asChild variant="outline"><Link href="/resources">Open resources</Link></Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
