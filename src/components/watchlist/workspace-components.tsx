import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  BookmarkIcon,
  Building2Icon,
  FolderSearch2Icon,
  RssIcon,
} from "lucide-react"

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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { BrandMark } from "./brand-mark"
import type { ProductSummary, WorkspaceNavItem } from "./types"
import { visibleProductBadges } from "./utils"

const DEFAULT_WORKSPACE_NAV: WorkspaceNavItem[] = [
  { value: "saved", label: "Saved", href: "/workspace/saved" },
  { value: "evaluations", label: "Evaluations", href: "/workspace/evaluations" },
  { value: "notes", label: "Notes", href: "/workspace/notes" },
  { value: "following", label: "Following", href: "/workspace/following" },
]

interface WorkspaceShellProps {
  activeSection: string
  title: string
  description: string
  children: ReactNode
  navigation?: WorkspaceNavItem[]
  actions?: ReactNode
}

export function WorkspaceShell({
  activeSection,
  title,
  description,
  children,
  navigation = DEFAULT_WORKSPACE_NAV,
  actions,
}: WorkspaceShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-3xl flex-col gap-2">
            <p className="text-sm font-medium text-primary">Private workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className="overflow-x-auto pb-1">
          <Tabs value={activeSection}>
            <TabsList className="h-11 w-max">
              {navigation.map((item) => (
                <TabsTrigger key={item.value} value={item.value} asChild>
                  <Link href={item.href}>
                    {item.label}
                    {typeof item.count === "number" ? (
                      <Badge variant="secondary">{item.count}</Badge>
                    ) : null}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <section aria-label={title}>{children}</section>
    </main>
  )
}

interface WorkspaceProductRowProps {
  product: ProductSummary
  contextLabel?: string
  actions?: ReactNode
}

export function WorkspaceProductRow({
  product,
  contextLabel,
  actions,
}: WorkspaceProductRowProps) {
  const badges = visibleProductBadges(product.badges, 2)

  return (
    <Card>
      <CardHeader className="sm:flex sm:flex-row sm:items-start">
        <BrandMark name={product.name} src={product.logoSrc} />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">
            <Link href={product.href} className="hover:underline">
              {product.name}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">{product.summary}</CardDescription>
        </div>
        {contextLabel ? <Badge variant="outline">{contextLabel}</Badge> : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Badge key={badge.label} variant={badge.tone ?? "secondary"}>
            {badge.label}
          </Badge>
        ))}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {product.lastReviewedLabel
            ? `Checked ${product.lastReviewedLabel}`
            : "Evidence review pending"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button asChild variant="ghost">
            <Link href={product.href}>
              Open profile
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

interface EvaluationCollectionCardProps {
  title: string
  href: string
  description?: string
  productCount: number
  updatedLabel?: string
  statusLabel?: string
  actions?: ReactNode
}

export function EvaluationCollectionCard({
  title,
  href,
  description,
  productCount,
  updatedLabel,
  statusLabel,
  actions,
}: EvaluationCollectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>
              <Link href={href} className="hover:underline">
                {title}
              </Link>
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {productCount} {productCount === 1 ? "candidate" : "candidates"}
          {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{actions}</div>
        <Button asChild variant="ghost">
          <Link href={href}>
            Open evaluation
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

interface FollowingCompanyCardProps {
  name: string
  href: string
  logoSrc?: string | null
  summary?: string
  publishedUpdateCount?: number
  lastUpdateLabel?: string
  actions?: ReactNode
}

export function FollowingCompanyCard({
  name,
  href,
  logoSrc,
  summary,
  publishedUpdateCount,
  lastUpdateLabel,
  actions,
}: FollowingCompanyCardProps) {
  return (
    <Card>
      <CardHeader className="sm:flex sm:flex-row sm:items-start">
        <BrandMark name={name} src={logoSrc} />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">
            <Link href={href} className="hover:underline">
              {name}
            </Link>
          </CardTitle>
          {summary ? <CardDescription className="line-clamp-2">{summary}</CardDescription> : null}
        </div>
        <Badge variant="secondary">
          <RssIcon />
          Following
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {typeof publishedUpdateCount === "number"
            ? `${publishedUpdateCount} published ${publishedUpdateCount === 1 ? "update" : "updates"}`
            : "No published update count"}
          {lastUpdateLabel ? ` · Latest ${lastUpdateLabel}` : ""}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{actions}</div>
        <Button asChild variant="ghost">
          <Link href={href}>
            <Building2Icon data-icon="inline-start" />
            Company profile
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

interface WorkspaceEmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}

export function WorkspaceEmptyState({
  title,
  description,
  action,
  icon,
}: WorkspaceEmptyStateProps) {
  return (
    <Empty className="border py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {icon ?? <FolderSearch2Icon />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

interface SavedProductsIntroProps {
  count: number
}

export function SavedProductsIntro({ count }: SavedProductsIntroProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <BookmarkIcon className="size-4" aria-hidden="true" />
      <span>
        {count} saved {count === 1 ? "product" : "products"}. Saving does not follow a company or share interest with it.
      </span>
    </div>
  )
}
