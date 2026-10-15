import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reviewedNewsData from "../../../../data/reviewed-news.json";
import { mergePublicNews } from "@/lib/news/feed";
import { reviewedNewsCollectionSchema } from "@/lib/news/schema";

const mocks = vi.hoisted(() => ({ getFeed: vi.fn() }));
vi.mock("@/lib/news/public-feed", () => ({ getPublicNewsFeed: mocks.getFeed }));
import UpdatesPage from "./page";

const items = mergePublicNews(reviewedNewsCollectionSchema.parse(reviewedNewsData), [], new Set(), new Date("2026-10-15T12:00:00Z"));
beforeEach(() => mocks.getFeed.mockReset());
afterEach(cleanup);

describe("Global Updates page", () => {
  it("renders public funding and product news with chronological headings and source links", async () => {
    mocks.getFeed.mockResolvedValue({ items, publicationStatus: "available" });
    render(await UpdatesPage());
    expect(screen.getByRole("heading", { level: 1, name: "Global Updates" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent)).toEqual(["2026", "2025", "2023"]);
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(26);
    expect(screen.getByText(/No sign-in required/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Original source for Autoheal announces a $7.9M seed round (opens in a new tab)" })).toHaveAttribute("href", "https://autoheal.ai/blog/autoheal-seed-funding");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const funding = screen.getByRole("heading", { name: "Autoheal announces a $7.9M seed round" }).closest('[data-slot="card"]')!;
    expect(funding).toHaveClass("scroll-mt-36");
    expect(within(funding as HTMLElement).getByText("Unknown")).toBeInTheDocument();
    expect(within(funding as HTMLElement).getByText("Announced")).toBeInTheDocument();
  });

  it.each(["unavailable", "partial"])("keeps the public feed and provides recovery during %s publication state", async (publicationStatus) => {
    mocks.getFeed.mockResolvedValue({ items, publicationStatus });
    render(await UpdatesPage());
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(26);
    expect(screen.getByRole("alert")).toHaveTextContent("this does not mean there are no updates");
    expect(screen.getByRole("button", { name: "Try again" }).closest("form")).toHaveAttribute("action", "/updates");
    expect(screen.queryByText("No reviewed news is available yet")).not.toBeInTheDocument();
  });

  it("never reports an empty publication history during a complete outage", async () => {
    mocks.getFeed.mockResolvedValue({ items: [], publicationStatus: "unavailable" });
    render(await UpdatesPage());
    expect(screen.getByText("Additional Watchlist publications are temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No reviewed news is available yet")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 source-linked/)).not.toBeInTheDocument();
  });

  it("uses a real empty state only after a successful publication read", async () => {
    mocks.getFeed.mockResolvedValue({ items: [], publicationStatus: "available" });
    render(await UpdatesPage());
    expect(screen.getByText("No reviewed news is available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
