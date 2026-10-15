import { describe, expect, it } from "vitest";

import robots from "./robots";

describe("public crawler access", () => {
  it("permits public pages for search crawlers through the wildcard group", () => {
    const result = robots();
    expect(result.rules).toEqual({
      userAgent: "*", allow: "/", disallow: ["/workspace/", "/settings", "/auth/"],
    });
    expect(result.sitemap).toBe("https://aisrewatchlist.com/sitemap.xml");
  });
});
