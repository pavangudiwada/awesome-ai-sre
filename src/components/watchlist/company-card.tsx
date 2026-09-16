"use client"

import Link from "next/link"
import { ArrowRightIcon, FileTextIcon } from "lucide-react"

import { BrandMark } from "@/components/watchlist/brand-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import type { CatalogCompany, CatalogProduct } from "@/types/catalog"

interface CompanyCardProps {
  company: CatalogCompany
  products: readonly CatalogProduct[]
}

/** A compact public entry point. Hover or keyboard-focus the name for context. */
export function CompanyCard({ company, products }: CompanyCardProps) {
  const firstProduct = products[0]
  const productLabel = `${products.length} listed ${products.length === 1 ? "product" : "products"}`
  const lastChecked = company.sources
    .map((source) => source.checkedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)

  return (
    <Card size="sm" className="h-full">
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BrandMark name={company.name} src={firstProduct?.logo} />
          <div className="min-w-0 flex-1">
            <HoverCard openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Link
                  href={`/companies/${company.slug}`}
                  className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {company.name}
                </Link>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 p-4" align="start">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {productLabel} in the public Watchlist catalog.
                    </p>
                  </div>
                  {products.length ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Products</p>
                      <p className="text-sm">{products.map((product) => product.name).join(", ")}</p>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {company.mappingStatus === "confirmed"
                      ? "Identity mapping is confirmed in the catalog."
                      : "Identity mapping needs editorial review."}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <CardDescription className="mt-1">
              {products.length
                ? `${productLabel} with source-linked company references.`
                : "Company research registry entry with source-linked references."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">{productLabel}</Badge>
        <Badge variant="outline">
          {company.mappingStatus === "confirmed" ? "Identity mapped" : "Mapping needs review"}
        </Badge>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <FileTextIcon aria-hidden="true" />
          {lastChecked ? `Sources checked ${lastChecked}` : "Source check date unknown"}
        </span>
        <Button asChild variant="link" size="sm" className="shrink-0 px-0">
          <Link href={`/companies/${company.slug}`}>
            View company
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
