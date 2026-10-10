import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tools",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/lib/analytics/events", () => ({ trackSearchResultBucket: vi.fn() }));
vi.mock("@/components/watchlist", () => ({
  FilterBar: ({ resultCount }: { resultCount: number }) =>
    createElement("p", null, `${resultCount} results`),
  ProductCard: ({ product }: { product: { name: string; href: string } }) =>
    createElement("a", { href: product.href }, product.name),
  ProductGrid: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));

import type { saveProductAction } from "@/actions/workflows";
import { CatalogDirectory } from "./catalog-directory";

const initialState = {
  query: "Hyground", category: "aiops", deployments: ["on-prem" as const], sort: "name-asc" as const,
};
const props = {
  initialState,
  saveAction: vi.fn() as unknown as typeof saveProductAction,
  products: ["Hyground", "Datadog"].map((name) => ({
    product: { name, slug: name.toLowerCase(), href: `/tools/${name.toLowerCase()}`, summary: name },
    categories: ["aiops"], deployment: ["on-prem"],
  })),
};

describe("CatalogDirectory navigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/tools?q=Hyground&category=aiops&deployment=on-prem");
  });

  it("updates the shareable URL immediately and clears only search while returning focus", () => {
    render(<CatalogDirectory {...props} />);
    const input = screen.getByRole("textbox", { name: "Search products" });
    fireEvent.change(input, { target: { value: "Datadog" } });
    expect(new URLSearchParams(window.location.search).get("q")).toBe("Datadog");
    expect(screen.getByRole("link", { name: "Datadog" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveFocus();
    expect(window.location.search).toBe("?category=aiops&deployment=on-prem");
    expect(screen.getByText("2 results")).toBeInTheDocument();
  });

  it("restores the URL query on history navigation even when server props are stale", async () => {
    const view = render(<CatalogDirectory {...props} />);
    window.history.replaceState(null, "", "/tools?q=Datadog&category=aiops&deployment=on-prem");
    view.rerender(<CatalogDirectory {...props} />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search products" })).toHaveValue("Datadog"));
    expect(screen.getByRole("link", { name: "Datadog" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Hyground" })).not.toBeInTheDocument();
  });
});
