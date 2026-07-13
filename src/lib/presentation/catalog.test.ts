import { describe, expect, it } from "vitest"

import {
  getCompanyBySlug,
  getObservabilityProductBySlug,
  getProductBySlug,
} from "@/lib/catalog"

import {
  observabilityEvidenceClaims,
  observabilityResourceLinks,
  productEvidenceClaims,
  productResourceLinks,
} from "./catalog"

describe("evidence presentation", () => {
  it("turns Wave 1 capabilities into source-linked documented claims", () => {
    const product = getProductBySlug("runwhen")
    const company = getCompanyBySlug("runwhen")

    expect(product).toBeDefined()
    expect(company).toBeDefined()

    const claims = productEvidenceClaims(product!, company)

    expect(claims).toHaveLength(product!.features.length)
    expect(claims.every((claim) => claim.status === "documented")).toBe(true)
    expect(claims.every((claim) => claim.sourceHref?.startsWith("https://"))).toBe(true)
    expect(claims.every((claim) => claim.lastCheckedLabel === "2026-07-10")).toBe(true)
  })

  it("does not promote an unreviewed non-cohort record into evidence", () => {
    const product = getProductBySlug("agent-sre")

    expect(product).toBeDefined()
    expect(productEvidenceClaims(product!)).toEqual([])
  })

  it("labels observability use cases as vendor claims", () => {
    const product = getObservabilityProductBySlug("grafana")

    expect(product).toBeDefined()
    const claims = observabilityEvidenceClaims(product!)

    expect(claims.length).toBeGreaterThan(0)
    expect(claims.every((claim) => claim.status === "vendor-claimed")).toBe(true)
    expect(claims.every((claim) => claim.sourceHref === product!.url)).toBe(true)
  })

  it("returns catalog resources in a stable presentation order", () => {
    const product = getProductBySlug("better-stack")

    expect(product).toBeDefined()
    expect(productResourceLinks(product!)).toEqual([
      {
        kind: "website",
        label: "Official website",
        href: "https://betterstack.com/ai-sre",
      },
      {
        kind: "linkedin",
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/betterstack",
      },
      { kind: "x", label: "X", href: "https://x.com/betterstackhq" },
      {
        kind: "github",
        label: "GitHub",
        href: "https://github.com/BetterStackHQ",
      },
    ])
  })

  it("does not invent absent social resources", () => {
    const product = getProductBySlug("infrabase")

    expect(product).toBeDefined()
    expect(productResourceLinks(product!)).toEqual([
      {
        kind: "website",
        label: "Official website",
        href: "https://infrabase.co",
      },
    ])
  })

  it("keeps an editorial Product Hunt destination after the social accounts", () => {
    const product = getProductBySlug("steadwing")

    expect(product).toBeDefined()
    expect(productResourceLinks(product!).at(-1)).toEqual({
      kind: "producthunt",
      label: "Product Hunt",
      href: "https://www.producthunt.com/products/steadwing",
    })
  })

  it("orders observability first-party resources without inferring social accounts", () => {
    const product = getObservabilityProductBySlug("grafana")

    expect(product).toBeDefined()
    expect(observabilityResourceLinks(product!)).toEqual([
      {
        kind: "website",
        label: "Official website",
        href: product!.url,
      },
      ...(product!.links.docs
        ? [{
            kind: "documentation" as const,
            label: "Documentation",
            href: product!.links.docs,
          }]
        : []),
      ...(product!.links.github
        ? [{
            kind: "github" as const,
            label: "GitHub",
            href: product!.links.github,
          }]
        : []),
      ...(product!.links.community
        ? [{
            kind: "community" as const,
            label: "Community",
            href: product!.links.community,
          }]
        : []),
    ])
  })
})
