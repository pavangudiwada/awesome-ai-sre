import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { buildReadme } = createRequire(import.meta.url)("../generate-readme.js") as {
  buildReadme: (tools: Record<string, unknown>[]) => string;
};

describe("generated README discovery text", () => {
  it("preserves the Awesome AI SRE heading and canonical companion link", () => {
    const output = buildReadme([]);
    expect(output.startsWith("# Awesome AI SRE\n")).toBe(true);
    expect(output).toContain("site reliability engineering (SRE)");
    expect(output).toContain("[AI SRE Watchlist](https://aisrewatchlist.com)");
    expect(output).not.toContain("aisrewatchlist.vercel.app");
  });

  it("preserves discovery text when catalog entries are regenerated", () => {
    const output = buildReadme([{
      name: "Example tool", slug: "example", url: "https://example.com",
      summary: "An incident investigation tool.", deployment: ["saas"],
      tags: ["Incident Response"], dateAdded: "2026-01-01", opensource: false,
    }]);
    expect(output.match(/^# Awesome AI SRE$/gm)).toHaveLength(1);
    expect(output).toContain("### Incident Response (1)");
    expect(output).toContain("[Example tool](https://example.com)");
    expect(output).toContain("[Methodology](https://aisrewatchlist.com/methodology)");
  });
});
