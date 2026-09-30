"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { FilterBar, ProductCard, ProductGrid } from "@/components/watchlist";
import type {
  AppliedFilter,
  MarketplaceCategory,
  ProductSummary,
} from "@/components/watchlist/types";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { saveProductAction } from "@/actions/workflows";
import { trackSearchResultBucket } from "@/lib/analytics/events";
import {
  directoryHref,
  isDirectoryDeployment,
  isDirectorySort,
  parseDirectoryQuery,
  type DirectoryQueryState,
} from "@/lib/catalog/directory-query";

export interface DirectoryProduct {
  product: ProductSummary;
  categories: string[];
  deployment: string[];
  dateAdded?: string;
}

interface CatalogDirectoryProps {
  products: DirectoryProduct[];
  savedSlugs?: string[];
  initialState: DirectoryQueryState;
  saveAction: typeof saveProductAction;
}

const CATEGORY_LABELS: Record<string, string> = {
  "ai-sre": "AI SRE",
  "incident-ai": "Incident AI",
  observability: "Observability",
  aiops: "AIOps",
  runbooks: "Runbooks",
  learning: "Learning",
  oss: "Open source",
};

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function CatalogDirectory({
  products,
  savedSlugs = [],
  initialState,
  saveAction,
}: CatalogDirectoryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [directoryState, setDirectoryState] = useState(initialState);
  const directoryStateRef = useRef(initialState);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { query, category, deployments, sort } = directoryState;
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const saved = useMemo(() => new Set(savedSlugs), [savedSlugs]);

  const replaceDirectoryUrl = useCallback(
    (nextState: DirectoryQueryState) => {
      const nextHref = directoryHref(pathname, nextState);
      const currentHref = `${window.location.pathname}${window.location.search}`;
      if (nextHref === currentHref) return;

      // Filtering is local. Avoid an in-flight server navigation sending a
      // visitor back to the directory after they open a product profile.
      window.history.replaceState(null, "", nextHref);
    },
    [pathname],
  );

  const updateDirectoryState = useCallback(
    (update: (current: DirectoryQueryState) => DirectoryQueryState) => {
      const nextState = update(directoryStateRef.current);
      directoryStateRef.current = nextState;
      setDirectoryState(nextState);
      replaceDirectoryUrl(nextState);
    },
    [replaceDirectoryUrl],
  );

  useEffect(() => {
    const nextState = parseDirectoryQuery(
      {
        q: searchParams.get("q") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        deployment: searchParams.getAll("deployment"),
        sort: searchParams.get("sort") ?? undefined,
      },
      Object.keys(CATEGORY_LABELS),
    );
    const nextHref = directoryHref(pathname, nextState);
    if (directoryHref(pathname, directoryStateRef.current) === nextHref) return;

    directoryStateRef.current = nextState;
    setDirectoryState(nextState);
  }, [searchParams, pathname]);

  const categories = useMemo<MarketplaceCategory[]>(() => {
    const counts = new Map<string, number>();
    for (const item of products) {
      for (const value of item.categories) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return [
      { value: "all", label: "All", count: products.length },
      ...Object.entries(CATEGORY_LABELS)
        .filter(([value]) => (counts.get(value) ?? 0) > 0)
        .map(([value, label]) => ({ value, label, count: counts.get(value) })),
    ];
  }, [products]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((item) => category === "all" || item.categories.includes(category))
      .filter(
        (item) =>
          deployments.length === 0 ||
          deployments.some((deployment) => item.deployment.includes(deployment)),
      )
      .filter((item) => {
        if (!normalizedQuery) return true;
        const text = [
          item.product.name,
          item.product.companyName,
          item.product.summary,
          ...(item.product.badges ?? []).map((badge) => badge.label),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sort === "name-desc") {
          return right.product.name.localeCompare(left.product.name);
        }
        if (sort === "newest") {
          return (right.dateAdded ?? "").localeCompare(left.dateAdded ?? "");
        }
        return left.product.name.localeCompare(right.product.name);
      });
  }, [category, deployments, products, query, sort]);

  const appliedFilters: AppliedFilter[] = deployments.map((deployment) => ({
    id: `deployment-${deployment}`,
    label: deployment,
    onRemove: () =>
      updateDirectoryState((current) => ({
        ...current,
        deployments: current.deployments.filter((value) => value !== deployment),
      })),
  }));

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    replaceDirectoryUrl(directoryStateRef.current);
    trackSearchResultBucket(visible.length);
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-2 sm:px-6 lg:px-8">
        <form onSubmit={handleSearch} className="max-w-3xl">
          <Field>
            <FieldLabel htmlFor="directory-search" className="sr-only">
              Search products
            </FieldLabel>
            <InputGroup className="h-14 bg-card">
              <InputGroupInput
                ref={searchInputRef}
                id="directory-search"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  updateDirectoryState(
                    (current) => ({ ...current, query: nextQuery }),
                  );
                }}
                placeholder="Search products, companies, or capabilities…"
                autoComplete="off"
                disabled={!isHydrated}
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              {query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Clear search"
                    size="icon-sm"
                    className="size-11"
                    onClick={() => {
                      updateDirectoryState((current) => ({ ...current, query: "" }));
                      searchInputRef.current?.focus();
                    }}
                  >
                    <XIcon aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </Field>
        </form>
      </div>

      <FilterBar
        categories={categories}
        selectedCategory={category}
        onCategoryChange={(nextCategory) =>
          updateDirectoryState((current) => ({
            ...current,
            category: nextCategory,
          }))
        }
        sections={[
          {
            id: "deployment",
            label: "Deployment",
            kind: "multiple",
            options: [
              { value: "saas", label: "SaaS" },
              { value: "on-prem", label: "On-premises" },
              { value: "hybrid", label: "Hybrid" },
            ],
          },
        ]}
        selectedFilters={{ deployment: deployments }}
        onFilterChange={(id, values) => {
          if (id !== "deployment") return;
          updateDirectoryState((current) => ({
            ...current,
            deployments: values.filter(isDirectoryDeployment),
          }));
        }}
        appliedFilters={appliedFilters}
        onClearAll={() =>
          updateDirectoryState((current) => ({
            ...current,
            deployments: [],
          }))
        }
        resultCount={visible.length}
        sortOptions={[
          { value: "name-asc", label: "A–Z" },
          { value: "name-desc", label: "Z–A" },
          { value: "newest", label: "Newest added" },
        ]}
        selectedSort={sort}
        onSortChange={(nextSort) => {
          if (!isDirectorySort(nextSort)) return;
          updateDirectoryState((current) => ({
            ...current,
            sort: nextSort,
          }));
        }}
      />

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <ProductGrid
          onClearHref={pathname}
          emptyTitle="No products match your search and filters"
          emptyDescription="Try another search, choose a broader category, or reset the search and filters."
          clearLabel="Reset search and filters"
        >
          {visible.length
            ? visible.map(({ product }, index) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  saved={saved.has(product.slug)}
                  saveAction={saveAction}
                  mediaPriority={index < 4}
                />
              ))
            : undefined}
        </ProductGrid>
      </div>
    </div>
  );
}
