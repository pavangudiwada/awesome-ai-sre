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
  searchPlaceholder?: string
  searchHref?: string
  searchAction?: ServerFormAction
  defaultQuery?: string
}

export function MarketplaceHero({
  title = "Find the right tools for reliable systems.",
  description = "Explore source-linked AI SRE, observability, and incident-response tools.",
  searchPlaceholder = "Search by tool, company, or problem…",
  searchHref = "/tools",
  searchAction,
  defaultQuery,
}: MarketplaceHeroProps) {
  return (
    <section className="border-b bg-muted/30" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1
              id="marketplace-heading"
              className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <form
            action={searchAction ?? searchHref}
            method={searchAction ? undefined : "get"}
            className="w-full"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="marketplace-search" className="sr-only">
                  Search the AI SRE Watchlist
                </FieldLabel>
                <InputGroup className="mx-auto h-12 max-w-2xl bg-background shadow-xs">
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

          <div className="flex items-center justify-center text-sm">
            <Button asChild variant="link" className="h-11 px-0">
              <Link href="/tools">
                Browse all products
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
