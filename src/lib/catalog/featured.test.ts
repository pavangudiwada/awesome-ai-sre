import { describe, expect, it } from "vitest";

import { getRotatingFeaturedEntries } from "./featured";

const entries = Array.from({ length: 30 }, (_, index) => ({
  slug: `tool-${String(index).padStart(2, "0")}`,
}));

describe("getRotatingFeaturedEntries", () => {
  it("keeps the featured set stable during a UTC day", () => {
    const morning = getRotatingFeaturedEntries(entries, new Date("2026-09-16T01:00:00Z"));
    const evening = getRotatingFeaturedEntries(entries, new Date("2026-09-16T23:59:59Z"));

    expect(evening).toEqual(morning);
    expect(new Set(morning.map((entry) => entry.slug))).toHaveLength(12);
  });

  it("rotates the featured set on the next UTC day", () => {
    const firstDay = getRotatingFeaturedEntries(entries, new Date("2026-09-16T12:00:00Z"));
    const nextDay = getRotatingFeaturedEntries(entries, new Date("2026-09-17T12:00:00Z"));

    expect(nextDay.map((entry) => entry.slug)).not.toEqual(
      firstDay.map((entry) => entry.slug),
    );
  });

  it("honors an explicit result limit", () => {
    expect(getRotatingFeaturedEntries(entries, new Date("2026-09-16T12:00:00Z"), 5)).toHaveLength(5);
    expect(getRotatingFeaturedEntries(entries, new Date("2026-09-16T12:00:00Z"), 0)).toEqual([]);
  });
});
