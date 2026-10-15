import Link from "next/link"
import { JsonLd } from "@/components/content/json-ld"
import { breadcrumbStructuredData } from "@/lib/seo"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface WatchlistBreadcrumbProps {
  parentHref: string
  parentLabel: string
  currentLabel: string
}

export function WatchlistBreadcrumb({
  parentHref,
  parentLabel,
  currentLabel,
}: WatchlistBreadcrumbProps) {
  return (
    <>
    <JsonLd data={breadcrumbStructuredData(parentHref, parentLabel, currentLabel)} />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={parentHref}>{parentLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{currentLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    </>
  )
}
