"use client"

import Link from "next/link"
import { ArrowRightIcon, BookmarkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { BrandMark } from "./brand-mark"
import { ProductMedia } from "./product-media"
import type { ProductSummary, ServerFormAction } from "./types"
import { visibleProductBadges } from "./utils"

export interface ProductCardProps {
  product: ProductSummary
  saved?: boolean
  saveAction?: ServerFormAction
  onSaveChange?: (product: ProductSummary, saved: boolean) => void
  savePending?: boolean
  mediaPriority?: boolean
}

export function ProductCard({
  product,
  saved = false,
  saveAction,
  onSaveChange,
  savePending = false,
  mediaPriority = false,
}: ProductCardProps) {
  const badges = visibleProductBadges(product.badges)
  const saveLabel = saved ? `Remove ${product.name} from saved` : `Save ${product.name}`

  return (
    <Card className="group h-full overflow-hidden p-0">
      <div className="relative border-b">
        <Link href={product.href} aria-label={`View ${product.name} profile`}>
          <ProductMedia
            name={product.name}
            src={product.screenshotSrc}
            alt={product.screenshotAlt}
            priority={mediaPriority}
            className="transition-transform duration-200 group-hover:scale-[1.01] motion-reduce:transform-none motion-reduce:transition-none"
          />
        </Link>
        <div className="absolute right-3 top-3">
          {saveAction ? (
            <form action={saveAction}>
              <input type="hidden" name="productSlug" value={product.slug} />
              <input type="hidden" name="saved" value={saved ? "false" : "true"} />
              <input type="hidden" name="returnTo" value={product.href} />
              <SaveButton
                label={saveLabel}
                saved={saved}
                pending={savePending}
              />
            </form>
          ) : (
            <SaveButton
              label={saveLabel}
              saved={saved}
              pending={savePending}
              disabled={!onSaveChange}
              onClick={() => onSaveChange?.(product, !saved)}
            />
          )}
        </div>
      </div>

      <CardHeader className="gap-3 px-4 pt-4">
        <div className="flex items-start gap-3">
          <BrandMark name={product.name} src={product.logoSrc} />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">
              <Link href={product.href} className="hover:underline">
                {product.name}
              </Link>
            </CardTitle>
            {product.companyName ? (
              product.companyHref ? (
                <Link
                  href={product.companyHref}
                  className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {product.companyName}
                </Link>
              ) : (
                <p className="truncate text-sm text-muted-foreground">
                  {product.companyName}
                </p>
              )
            ) : null}
          </div>
        </div>
        <CardDescription className="line-clamp-3 leading-relaxed">
          {product.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2 px-4">
        {badges.map((badge) => (
          <Badge key={badge.label} variant={badge.tone ?? "secondary"}>
            {badge.label}
          </Badge>
        ))}
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-3 px-4 pb-4">
        <span className="text-xs text-muted-foreground">
          {product.lastReviewedLabel
            ? `Checked ${product.lastReviewedLabel}`
            : "Evidence review pending"}
        </span>
        <Button asChild variant="link" size="sm" className="shrink-0 px-0">
          <Link href={product.href}>
            View profile
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

interface SaveButtonProps {
  label: string
  saved: boolean
  pending: boolean
  disabled?: boolean
  onClick?: () => void
}

function SaveButton({
  label,
  saved,
  pending,
  disabled,
  onClick,
}: SaveButtonProps) {
  return (
    <Button
      type={onClick ? "button" : "submit"}
      variant={saved ? "default" : "secondary"}
      size="icon"
      className="size-11 shadow-sm"
      aria-label={label}
      aria-pressed={saved}
      disabled={disabled || pending}
      onClick={onClick}
    >
      <BookmarkIcon fill={saved ? "currentColor" : "none"} />
    </Button>
  )
}
