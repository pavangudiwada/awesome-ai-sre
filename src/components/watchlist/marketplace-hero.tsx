import Link from "next/link"
import {
  ArrowRightIcon,
  BellIcon,
  FolderSearch2Icon,
  NotebookPenIcon,
  SearchIcon,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

import type { ServerFormAction } from "./types"

interface MarketplaceHeroProps {
  title?: string
  description?: string
  eyebrow?: string
  searchPlaceholder?: string
  searchHref?: string
  searchAction?: ServerFormAction
  defaultQuery?: string
  proofPoints?: string[]
}

export function MarketplaceHero({
  title = "Find the AI tools that improve reliability.",
  description = "Research AI SRE, observability, and incident-response products with source-linked claims and practical evaluation details.",
  eyebrow = "Curated for reliability teams",
  searchPlaceholder = "Search tools, companies, capabilities…",
  searchHref = "/tools",
  searchAction,
  defaultQuery,
  proofPoints = [],
}: MarketplaceHeroProps) {
  return (
    <section className="border-b" aria-labelledby="marketplace-heading">
      <div className="mx-auto grid max-w-screen-2xl items-start gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
            <h1
              id="marketplace-heading"
              className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
            >
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <form
            action={searchAction ?? searchHref}
            method={searchAction ? undefined : "get"}
            className="max-w-3xl"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="marketplace-search" className="sr-only">
                  Search the AI SRE Watchlist
                </FieldLabel>
                <InputGroup className="h-14 bg-card">
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

          {proofPoints.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Marketplace coverage">
              {proofPoints.map((point) => (
                <Badge key={point} variant="outline">
                  {point}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Practitioner workflow
            </Badge>
            <CardTitle>Public proof, private process</CardTitle>
            <CardDescription>
              Research openly, then sign in only when you need a personal evaluation trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              <Item variant="muted">
                <ItemMedia variant="icon">
                  <FolderSearch2Icon aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Compare source-linked profiles</ItemTitle>
                  <ItemDescription>Unknown claims remain visibly unknown.</ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="muted">
                <ItemMedia variant="icon">
                  <NotebookPenIcon aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Keep notes and evaluations private</ItemTitle>
                  <ItemDescription>Your research workflow is never sold to vendors.</ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="muted">
                <ItemMedia variant="icon">
                  <BellIcon aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Follow reviewed company updates</ItemTitle>
                  <ItemDescription>Company follows stay distinct from product saves.</ItemDescription>
                </ItemContent>
              </Item>
            </ItemGroup>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="h-11">
              <Link href="/methodology">
                See the research method
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
