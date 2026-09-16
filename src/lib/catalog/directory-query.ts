import { z } from "zod";

export const DIRECTORY_DEPLOYMENTS = ["saas", "on-prem", "hybrid"] as const;
export const DIRECTORY_SORTS = ["name-asc", "name-desc", "newest"] as const;

export type DirectoryDeployment = (typeof DIRECTORY_DEPLOYMENTS)[number];
export type DirectorySort = (typeof DIRECTORY_SORTS)[number];

export interface DirectoryQueryState {
  query: string;
  category: string;
  deployments: DirectoryDeployment[];
  sort: DirectorySort;
}

export type DirectorySearchParams = Record<
  string,
  string | string[] | undefined
>;

const searchParamValueSchema = z.union([z.string(), z.array(z.string())]);
const directorySearchParamsSchema = z
  .object({
    q: searchParamValueSchema.optional(),
    category: searchParamValueSchema.optional(),
    deployment: searchParamValueSchema.optional(),
    sort: searchParamValueSchema.optional(),
  })
  .loose();
const deploymentSchema = z.enum(DIRECTORY_DEPLOYMENTS);
const sortSchema = z.enum(DIRECTORY_SORTS);

export function isDirectoryDeployment(
  value: string,
): value is DirectoryDeployment {
  return deploymentSchema.safeParse(value).success;
}

export function isDirectorySort(value: string): value is DirectorySort {
  return sortSchema.safeParse(value).success;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function allValues(value: string | string[] | undefined) {
  if (typeof value === "undefined") return [];
  return Array.isArray(value) ? value : [value];
}

export function parseDirectoryQuery(
  searchParams: DirectorySearchParams,
  allowedCategories: readonly string[],
): DirectoryQueryState {
  const parsed = directorySearchParamsSchema.parse(searchParams);
  const categoryCandidate = firstValue(parsed.category);
  const category =
    categoryCandidate && allowedCategories.includes(categoryCandidate)
      ? categoryCandidate
      : "all";
  const requestedDeployments = new Set(
    allValues(parsed.deployment).filter(
      (value): value is DirectoryDeployment => isDirectoryDeployment(value),
    ),
  );
  const sortCandidate = firstValue(parsed.sort);
  const sortResult = sortSchema.safeParse(sortCandidate);

  return {
    query: firstValue(parsed.q)?.trim() ?? "",
    category,
    deployments: DIRECTORY_DEPLOYMENTS.filter((value) =>
      requestedDeployments.has(value),
    ),
    sort: sortResult.success ? sortResult.data : "name-asc",
  };
}

export function serializeDirectoryQuery(state: DirectoryQueryState) {
  const searchParams = new URLSearchParams();
  const query = state.query.trim();

  if (query) searchParams.set("q", query);
  if (state.category !== "all") searchParams.set("category", state.category);
  for (const deployment of DIRECTORY_DEPLOYMENTS) {
    if (state.deployments.includes(deployment)) {
      searchParams.append("deployment", deployment);
    }
  }
  if (state.sort !== "name-asc") searchParams.set("sort", state.sort);

  return searchParams;
}

export function directoryHref(pathname: string, state: DirectoryQueryState) {
  const query = serializeDirectoryQuery(state).toString();
  return query ? `${pathname}?${query}` : pathname;
}
