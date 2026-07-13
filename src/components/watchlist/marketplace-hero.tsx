import Link from "next/link"
import { ArrowRightIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

import type { ServerFormAction } from "./types"

interface MarketplaceHeroProps {
  title?: string
  description?: string
  eyebrow?: string
  searchPlaceholder?: string
  searchHref?: string
  searchAction?: ServerFormAction
  defaultQuery?: string
}

export function MarketplaceHero({
  title = "Find the right tools for reliable systems.",
  description = "Browse clear, source-linked profiles of AI SRE, observability, and incident-response products. See what each tool does and where it may fit.",
  eyebrow = "An independent guide for reliability teams",
  searchPlaceholder = "Search by tool, company, or problem…",
  searchHref = "/tools",
  searchAction,
  defaultQuery,
}: MarketplaceHeroProps) {
  return (
    <section className="border-b bg-muted/30" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex max-w-4xl flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
            <h1
              id="marketplace-heading"
              className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
            >
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <form action={searchAction ?? searchHref} method={searchAction ? undefined : "get"}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="marketplace-search" className="sr-only">
                  Search the AI SRE Watchlist
                </FieldLabel>
                <InputGroup className="h-14 max-w-3xl bg-background shadow-xs">
                  <InputGroupInput
                    id="marketplace-search"
                    name="q"
                    defaultValue={defaultQuery}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                  />
                  <InputGroupAddon>
                    <SearchIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton type="submit" className="h-11">
                      Search
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </form>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Button asChild variant="link" className="h-11 px-0">
              <Link href="/tools">
                Browse all products
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <span className="text-muted-foreground">No account needed to browse.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
