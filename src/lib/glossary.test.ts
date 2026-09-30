import { describe, expect, it } from "vitest";
import { filterGlossary, GLOSSARY_TERMS } from "./glossary";
import { getProductBySlug } from "./catalog";

describe("glossary integrity and discovery", () => {
  it("resolves acronyms without losing the selected topic", () => {
    expect(filterGlossary(" SLO ", "Reliability").map(term => term.slug)).toEqual(["slo"]);
    expect(filterGlossary("RCA", "Delivery")).toEqual([]);
    expect(filterGlossary("", "All topics")).toHaveLength(GLOSSARY_TERMS.length);
  });
  it("keeps source URLs, related terms, and catalog destinations valid", () => {
    const slugs = new Set(GLOSSARY_TERMS.map(term => term.slug));
    expect(slugs.size).toBe(GLOSSARY_TERMS.length);
    for (const term of GLOSSARY_TERMS) {
      expect(term.source.url).toMatch(/^https:\/\//);
      for (const related of term.related) expect(slugs.has(related)).toBe(true);
      if (term.catalog.href.startsWith("/tools/")) expect(getProductBySlug(term.catalog.href.slice(7))).toBeDefined();
    }
  });
});
