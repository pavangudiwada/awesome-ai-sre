import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

describe("public sitemap", () => {
  it("includes the company directory as a public discovery route", () => {
    expect(sitemap().map((entry) => entry.url)).toContain(
      "https://aisrewatchlist.com/companies",
    );
  });

  it("emits published documents only when their substantive route exists", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(
      "https://aisrewatchlist.com/resources/replay-historical-incidents-safely",
    );
    expect(urls.some((url) => url.includes("/comparisons/"))).toBe(false);
    expect(urls.some((url) => url.includes("/blog/"))).toBe(false);
  });
});
