import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  FileQuestionIcon,
  LibraryIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { TrackedOutboundLink } from "@/components/analytics/public-events"

import { BrandMark } from "./brand-mark"
import { ProductMedia } from "./product-media"
import type {
  EvidenceClaim,
  ProductBadge,
  ProductFact,
  SourceReference,
} from "./types"
import { evidenceStatusLabel, evidenceStatusTone } from "./utils"

interface ProductProfileHeaderProps {
  name: string
  summary: string
  logoSrc?: string | null
  screenshotSrc?: string | null
  screenshotAlt?: string
  companyName?: string
  companyHref?: string
  websiteHref?: string
  websiteLabel?: string
  badges?: ProductBadge[]
  lastReviewedLabel?: string
  actions?: ReactNode
  analyticsSubject?: {
    kind: "product" | "company"
    slug: string
  }
}

export function ProductProfileHeader({
  name,
  summary,
  logoSrc,
  screenshotSrc,
  screenshotAlt,
  companyName,
  companyHref,
  websiteHref,
  websiteLabel = "Visit website",
  badges = [],
  lastReviewedLabel,
  actions,
  analyticsSubject,
}: ProductProfileHeaderProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,36rem)]">
        <div className="flex min-w-0 flex-col">
          <CardHeader className="gap-5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <BrandMark name={name} src={logoSrc} size="profile" />
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-medium leading-snug tracking-tight sm:text-4xl">
                  {name}
                </h1>
                {companyName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    By{" "}
                    {companyHref ? (
                      <Link href={companyHref} className="hover:text-foreground hover:underline">
                        {companyName}
                      </Link>
                    ) : (
                      companyName
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <CardDescription className="max-w-2xl text-base leading-relaxed">
              {summary}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2 px-6 sm:px-8">
            {badges.map((badge) => (
              <Badge key={badge.label} variant={badge.tone ?? "secondary"}>
                {badge.label}
              </Badge>
            ))}
          </CardContent>

          <CardFooter className="mt-auto flex flex-wrap items-center gap-3 p-6 sm:p-8">
            {websiteHref ? (
              <Button asChild className="h-11">
                {analyticsSubject ? (
                  <TrackedOutboundLink
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    subject={analyticsSubject}
                  >
                    {websiteLabel}
                    <ExternalLinkIcon data-icon="inline-end" />
                  </TrackedOutboundLink>
                ) : (
                  <a href={websiteHref} target="_blank" rel="noreferrer">
                    {websiteLabel}
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                )}
              </Button>
            ) : null}
            {actions}
            <span className="basis-full text-xs text-muted-foreground sm:ml-auto sm:basis-auto">
              {lastReviewedLabel
                ? `Last reviewed ${lastReviewedLabel}`
                : "Evidence review pending"}
            </span>
          </CardFooter>
        </div>

        <div className="border-t bg-muted/30 lg:border-l lg:border-t-0">
          <ProductMedia
            name={name}
            src={screenshotSrc}
            alt={screenshotAlt}
            priority
          />
        </div>
      </div>
    </Card>
  )
}

interface ProfileSectionProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  id?: string
}

export function ProfileSection({
  title,
  description,
  children,
  footer,
  id,
}: ProfileSectionProps) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}

interface ProfileFactGridProps {
  facts: ProductFact[]
  title?: string
  description?: string
}

export function ProfileFactGrid({
  facts,
  title = "Product facts",
  description = "Operational details for an initial evaluation.",
}: ProfileFactGridProps) {
  return (
    <ProfileSection title={title} description={description}>
      <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="font-medium">{fact.value}</dd>
            {fact.detail ? (
              <dd className="text-sm text-muted-foreground">{fact.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </ProfileSection>
  )
}

interface EvidenceSectionProps {
  claims: EvidenceClaim[]
  methodologyHref?: string
  title?: string
  description?: string
}

export function EvidenceSection({
  claims,
  methodologyHref = "/methodology",
  title = "Evidence",
  description = "Each claim shows where it came from and when it was last checked.",
}: EvidenceSectionProps) {
  return (
    <ProfileSection
      id="evidence"
      title={title}
      description={description}
      footer={
        <Button asChild variant="link" className="px-0">
          <Link href={methodologyHref}>
            Read the evidence methodology
            <ArrowUpRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      }
    >
      {claims.length === 0 ? (
        <Alert>
          <FileQuestionIcon />
          <AlertTitle>Evidence review pending</AlertTitle>
          <AlertDescription>
            This profile does not yet have source-linked evidence. Treat unsourced details as unknown.
          </AlertDescription>
        </Alert>
      ) : (
        <ItemGroup aria-label="Product evidence claims">
          {claims.map((claim) => (
            <Item key={claim.id} asChild variant="outline" className="items-start">
              <article>
                <ItemHeader className="flex-wrap items-start">
                  <ItemTitle className="max-w-3xl line-clamp-none leading-relaxed">
                    {claim.claim}
                  </ItemTitle>
                  <Badge variant={evidenceStatusTone(claim.status)}>
                    {evidenceStatusLabel(claim.status)}
                  </Badge>
                </ItemHeader>
                {claim.detail ? (
                  <ItemContent>
                    <ItemDescription className="line-clamp-none leading-relaxed">
                      {claim.detail}
                    </ItemDescription>
                  </ItemContent>
                ) : null}
                <ItemFooter className="flex-wrap">
                  <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {typeof claim.sourceCount === "number" ? (
                      <span>
                        {claim.sourceCount} {claim.sourceCount === 1 ? "source" : "sources"}
                      </span>
                    ) : null}
                    {claim.lastCheckedLabel ? (
                      <span>Checked {claim.lastCheckedLabel}</span>
                    ) : null}
                  </span>
                  {claim.sourceHref ? (
                    <Button asChild variant="link" className="h-11 px-0">
                      <a href={claim.sourceHref} target="_blank" rel="noreferrer">
                        View source
                        <ArrowUpRightIcon data-icon="inline-end" />
                      </a>
                    </Button>
                  ) : null}
                </ItemFooter>
              </article>
            </Item>
          ))}
        </ItemGroup>
      )}
    </ProfileSection>
  )
}

interface SourceListProps {
  sources: SourceReference[]
  title?: string
  description?: string
  analyticsSubject?: {
    kind: "product" | "company"
    slug: string
  }
}

export function SourceList({
  sources,
  title = "Sources",
  description = "Primary documentation, repositories, and first-party announcements used for this profile.",
  analyticsSubject,
}: SourceListProps) {
  return (
    <ProfileSection title={title} description={description}>
      {sources.length === 0 ? (
        <Alert>
          <LibraryIcon />
          <AlertTitle>No public sources listed</AlertTitle>
          <AlertDescription>
            Source collection for this profile is still in progress.
          </AlertDescription>
        </Alert>
      ) : (
        <ItemGroup aria-label="Profile sources">
          {sources.map((source) => (
            <Item key={source.id} asChild variant="outline" className="min-h-16">
              {analyticsSubject ? (
                <TrackedOutboundLink
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  subject={analyticsSubject}
                >
                  <ItemContent>
                    <ItemTitle>{source.title}</ItemTitle>
                    <ItemDescription>
                      {[source.publisher, source.sourceType, source.accessedAtLabel]
                        .filter(Boolean)
                        .join(" · ")}
                    </ItemDescription>
                  </ItemContent>
                  <ItemMedia variant="icon">
                    <ArrowUpRightIcon aria-hidden="true" />
                  </ItemMedia>
                </TrackedOutboundLink>
              ) : (
                <a href={source.href} target="_blank" rel="noreferrer">
                <ItemContent>
                  <ItemTitle>{source.title}</ItemTitle>
                  <ItemDescription>
                    {[source.publisher, source.sourceType, source.accessedAtLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </ItemDescription>
                </ItemContent>
                <ItemMedia variant="icon">
                  <ArrowUpRightIcon aria-hidden="true" />
                </ItemMedia>
                </a>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}
    </ProfileSection>
  )
}
