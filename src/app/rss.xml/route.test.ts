import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("public RSS feed", () => {
  it("never advertises document URLs without substantive routes", async () => {
    const response = GET();
    const xml = await response.text();

    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(xml).toContain(
      "https://aisrewatchlist.com/resources/replay-historical-incidents-safely",
    );
    expect(xml).not.toContain("/comparisons/");
    expect(xml).not.toContain("/blog/");
  });
});
