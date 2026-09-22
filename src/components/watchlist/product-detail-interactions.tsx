"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
} from "lucide-react"

import { TrackedOutboundAnchor } from "@/components/analytics/event-beacon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import type { EvidenceClaim, EvidenceStatus } from "./types"
import { evidenceStatusLabel, evidenceStatusTone } from "./utils"

const REQUIRED_PROFILE_SECTIONS = [
  { id: "summary", label: "Summary" },
] as const

export function ProductSectionNav({
  hasCapabilities,
  evidenceCount,
  sourceCount,
}: {
  hasCapabilities: boolean
  evidenceCount: number
  sourceCount: number
}) {
  const [activeSection, setActiveSection] = useState("summary")
  const sections = useMemo(
    () => [
      ...REQUIRED_PROFILE_SECTIONS,
      ...(hasCapabilities ? [{ id: "capabilities", label: "Capabilities" }] : []),
      ...(evidenceCount ? [{ id: "evidence", label: "Evidence" }] : []),
      ...(sourceCount ? [{ id: "sources", label: "Sources" }] : []),
    ],
    [evidenceCount, hasCapabilities, sourceCount],
  )

  useEffect(() => {
    const visibleSections = sections.flatMap(({ id }) => {
      const section = document.getElementById(id)
      return section ? [section] : []
    })
    if (!visibleSections.length) return

    const updateActiveSection = () => {
      const current = visibleSections
        .filter((section) => section.getBoundingClientRect().top <= 160)
        .at(-1)
      setActiveSection(current?.id ?? visibleSections[0].id)
    }

    updateActiveSection()
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)
    return () => {
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
    }
  }, [sections])

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(id)
  }

  return (
    <nav
      aria-label="Product sections"
      className={cn(
        "sticky z-30 -mx-1 border-b bg-background/95 px-1 py-2 backdrop-blur",
        "top-16",
      )}
    >
      <div className="grid grid-cols-2 items-center gap-1 sm:flex sm:w-max">
        {sections.map(({ id, label }) => {
          const count = id === "evidence" ? evidenceCount : id === "sources" ? sourceCount : null
          const active = activeSection === id
          return (
            <Button
              key={id}
              asChild
              variant={active ? "secondary" : "ghost"}
              className="h-11 justify-center"
            >
              <a
                href={`#${id}`}
                aria-current={active ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  scrollToSection(id)
                }}
              >
                {label}
                {count !== null ? <Badge variant="outline">{count}</Badge> : null}
              </a>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}

export function EvidenceExplorer({
  claims,
  productSlug,
}: {
  claims: EvidenceClaim[]
  productSlug: string
}) {
  const [filter, setFilter] = useState<"all" | EvidenceStatus>("all")
  const [openClaimId, setOpenClaimId] = useState<string | null>(claims[0]?.id ?? null)
  const statuses = useMemo(
    () => [...new Set(claims.map((claim) => claim.status))],
    [claims],
  )
  const filteredClaims =
    filter === "all" ? claims : claims.filter((claim) => claim.status === filter)

  if (!claims.length) return null

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        value={filter}
        variant="outline"
        size="sm"
        aria-label="Filter evidence claims"
        onValueChange={(value) => {
          if (value) setFilter(value as "all" | EvidenceStatus)
        }}
      >
        <ToggleGroupItem
          value="all"
          className="h-11"
          aria-label="Show all evidence claims"
        >
          All claims
        </ToggleGroupItem>
        {statuses.map((status) => (
          <ToggleGroupItem
            key={status}
            value={status}
            className="h-11"
            aria-label={`Show ${evidenceStatusLabel(status).toLowerCase()} claims`}
          >
            {evidenceStatusLabel(status)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ItemGroup aria-label="Product evidence claims" className="gap-2">
        {filteredClaims.map((claim) => {
          const expanded = openClaimId === claim.id
          const detailId = `evidence-claim-${claim.id}`
          return (
            <Item key={claim.id} variant="outline" className="items-start">
              <ItemMedia variant="icon">
                <FileTextIcon aria-hidden="true" />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemHeader className="flex-col items-start sm:flex-row">
                  <ItemTitle className="line-clamp-none leading-relaxed">
                    {claim.claim}
                  </ItemTitle>
                  <ItemActions className="w-full justify-between sm:w-auto">
                    <Badge variant={evidenceStatusTone(claim.status)}>
                      {evidenceStatusLabel(claim.status)}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="size-11"
                      aria-expanded={expanded}
                      aria-controls={detailId}
                      aria-label={`${expanded ? "Collapse" : "Expand"} evidence claim: ${claim.claim}`}
                      onClick={() => setOpenClaimId(expanded ? null : claim.id)}
                    >
                      {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </Button>
                  </ItemActions>
                </ItemHeader>
                {expanded ? (
                  <div id={detailId} className="flex flex-col gap-3">
                    {claim.detail ? (
                      <ItemDescription className="line-clamp-none leading-relaxed">
                        {claim.detail}
                      </ItemDescription>
                    ) : null}
                    <ItemFooter className="flex-wrap">
                      <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {typeof claim.sourceCount === "number" ? (
                          <span className="flex items-center gap-1">
                            <FileTextIcon className="size-3.5" aria-hidden="true" />
                            {claim.sourceCount} {claim.sourceCount === 1 ? "source" : "sources"}
                          </span>
                        ) : null}
                        {claim.lastCheckedLabel ? (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3.5" aria-hidden="true" />
                            Checked {claim.lastCheckedLabel}
                          </span>
                        ) : null}
                      </span>
                      {claim.sourceHref ? (
                        <Button asChild variant="link" className="h-11 px-0">
                          <TrackedOutboundAnchor
                            href={claim.sourceHref}
                            target="_blank"
                            rel="noreferrer"
                            payload={{ subjectKind: "product", subjectSlug: productSlug }}
                          >
                            View source
                          </TrackedOutboundAnchor>
                        </Button>
                      ) : null}
                    </ItemFooter>
                  </div>
                ) : null}
              </ItemContent>
            </Item>
          )
        })}
      </ItemGroup>
    </div>
  )
}
