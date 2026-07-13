"use client"

import { SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import type {
  AppliedFilter,
  FilterSection,
  MarketplaceCategory,
  SortOption,
} from "./types"

type SelectedFilters = Record<string, string[]>

interface FilterBarProps {
  categories: MarketplaceCategory[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  sections?: FilterSection[]
  selectedFilters?: SelectedFilters
  onFilterChange?: (sectionId: string, values: string[]) => void
  appliedFilters?: AppliedFilter[]
  onClearAll?: () => void
  resultCount?: number
  sortOptions?: SortOption[]
  selectedSort?: string
  onSortChange?: (sort: string) => void
}

export function FilterBar({
  categories,
  selectedCategory,
  onCategoryChange,
  sections = [],
  selectedFilters = {},
  onFilterChange,
  appliedFilters = [],
  onClearAll,
  resultCount,
  sortOptions = [],
  selectedSort,
  onSortChange,
}: FilterBarProps) {
  const filterCount = Object.values(selectedFilters).reduce(
    (total, values) => total + values.length,
    0
  )

  return (
    <section className="border-b bg-background" aria-label="Directory controls">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto pb-1">
            <ToggleGroup
              type="single"
              variant="outline"
              value={selectedCategory}
              onValueChange={(value) => value && onCategoryChange(value)}
              aria-label="Product category"
              className="w-max justify-start"
            >
              {categories.map((category) => (
                <ToggleGroupItem
                  key={category.value}
                  value={category.value}
                  aria-label={`Show ${category.label}`}
                  className="h-11 shrink-0"
                >
                  {category.label}
                  {typeof category.count === "number" ? (
                    <Badge variant="secondary">{category.count}</Badge>
                  ) : null}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {sections.length > 0 ? (
            <FilterSheet
              sections={sections}
              selectedFilters={selectedFilters}
              onFilterChange={onFilterChange}
              filterCount={filterCount}
              resultCount={resultCount}
              onClearAll={onClearAll}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-11 flex-wrap items-center gap-2">
            {appliedFilters.map((filter) =>
              filter.onRemove ? (
                <Button
                  key={filter.id}
                  type="button"
                  variant="secondary"
                  className="h-11"
                  onClick={filter.onRemove}
                  aria-label={`Remove ${filter.label} filter`}
                >
                  {filter.label}
                  <XIcon data-icon="inline-end" />
                </Button>
              ) : (
                <Badge key={filter.id} variant="secondary" className="h-8 px-3">
                  {filter.label}
                </Badge>
              )
            )}
            {appliedFilters.length > 0 && onClearAll ? (
              <Button type="button" variant="ghost" className="h-11" onClick={onClearAll}>
                Clear all
              </Button>
            ) : null}
            {appliedFilters.length === 0 && typeof resultCount === "number" ? (
              <p className="text-sm text-muted-foreground">
                {resultCount.toLocaleString()} {resultCount === 1 ? "product" : "products"}
              </p>
            ) : null}
          </div>

          {sortOptions.length > 0 && selectedSort ? (
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="directory-sort" className="shrink-0">
                Sort
              </FieldLabel>
              <Select value={selectedSort} onValueChange={onSortChange}>
                <SelectTrigger id="directory-sort" className="h-11 w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>
      </div>
    </section>
  )
}

interface FilterSheetProps {
  sections: FilterSection[]
  selectedFilters: SelectedFilters
  onFilterChange?: (sectionId: string, values: string[]) => void
  filterCount: number
  resultCount?: number
  onClearAll?: () => void
}

function FilterSheet({
  sections,
  selectedFilters,
  onFilterChange,
  filterCount,
  resultCount,
  onClearAll,
}: FilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="h-11 shrink-0">
          <SlidersHorizontalIcon data-icon="inline-start" />
          Filters
          {filterCount > 0 ? <Badge>{filterCount}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter products</SheetTitle>
          <SheetDescription>
            Narrow the directory by deployment, pricing, and technical criteria.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          {sections.map((section, index) => {
            const values = selectedFilters[section.id] ?? []

            return (
              <div key={section.id} className="flex flex-col gap-6">
                {index > 0 ? <Separator /> : null}
                {section.kind === "single" ? (
                  <FieldSet>
                    <FieldLegend>{section.label}</FieldLegend>
                    <Select
                      value={values[0] ?? "all"}
                      onValueChange={(value) =>
                        onFilterChange?.(section.id, value === "all" ? [] : [value])
                      }
                    >
                      <SelectTrigger aria-label={section.label} className="h-11 w-full">
                        <SelectValue placeholder={`Choose ${section.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">All</SelectItem>
                          {section.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                              {typeof option.count === "number"
                                ? ` (${option.count})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldSet>
                ) : (
                  <FieldSet>
                    <FieldLegend>{section.label}</FieldLegend>
                    <div className="flex flex-col gap-1">
                      {section.options.map((option) => {
                        const checked = values.includes(option.value)
                        const inputId = `filter-${section.id}-${option.value}`

                        return (
                          <Field
                            key={option.value}
                            orientation="horizontal"
                            className="min-h-11"
                          >
                            <Checkbox
                              id={inputId}
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                const nextValues = nextChecked === true
                                  ? [...values, option.value]
                                  : values.filter((value) => value !== option.value)
                                onFilterChange?.(section.id, nextValues)
                              }}
                            />
                            <FieldContent>
                              <FieldLabel htmlFor={inputId} className="font-normal">
                                {option.label}
                                {typeof option.count === "number" ? (
                                  <span className="ml-auto text-muted-foreground">
                                    {option.count}
                                  </span>
                                ) : null}
                              </FieldLabel>
                            </FieldContent>
                          </Field>
                        )
                      })}
                    </div>
                  </FieldSet>
                )}
              </div>
            )
          })}
        </div>

        <SheetFooter className="border-t">
          {filterCount > 0 && onClearAll ? (
            <Button type="button" variant="outline" onClick={onClearAll}>
              Clear filters
            </Button>
          ) : null}
          <SheetClose asChild>
            <Button type="button" className="h-11">
              {typeof resultCount === "number"
                ? `View ${resultCount.toLocaleString()} ${resultCount === 1 ? "result" : "results"}`
                : "View results"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
