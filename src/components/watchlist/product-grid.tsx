import { Children, type ReactNode } from "react"
import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface ProductGridProps {
  children?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onClearHref?: string
}

export function ProductGrid({
  children,
  emptyTitle = "No products match these filters",
  emptyDescription = "Try a broader category or clear some filters.",
  onClearHref,
}: ProductGridProps) {
  if (Children.count(children) === 0) {
    return (
      <Empty className="mx-auto my-10 max-w-2xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {onClearHref ? (
          <EmptyContent>
            <Button asChild variant="outline" className="h-11">
              <Link href={onClearHref}>Clear filters</Link>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-5">
      {children}
    </div>
  )
}
