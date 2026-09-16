import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CompanyCard } from "./company-card"

const company = {
  name: "RunWhen",
  slug: "runwhen",
  website: "https://www.runwhen.com",
  productSlugs: ["runwhen"],
  mappingStatus: "confirmed" as const,
  sources: [{
    label: "Official documentation",
    url: "https://docs.runwhen.com",
    checkedAt: "2026-07-10",
  }],
  sourceFile: "tools/companies/runwhen.yaml",
}

const products = [{
  catalogFamily: "ai-sre" as const,
  name: "RunWhen",
  slug: "runwhen",
  companySlug: "runwhen",
  url: "https://www.runwhen.com",
  summary: "Runbook automation for operators.",
  deployment: ["saas"] as const,
  openSource: false,
  tags: ["Incident Response"] as const,
  dateAdded: "2026-07-10",
  features: [],
  socialLinks: {},
  editorialState: "unreviewed" as const,
  lastReviewed: null,
  sourceFile: "tools/operate/runwhen.yaml",
}]

describe("CompanyCard", () => {
  it("links to a company profile and presents only catalog-backed context", () => {
    render(<CompanyCard company={company} products={products} />)

    expect(screen.getByRole("link", { name: "RunWhen" })).toHaveAttribute(
      "href",
      "/companies/runwhen",
    )
    expect(screen.getByText("1 listed product")).toBeInTheDocument()
    expect(screen.getByText("Identity mapped")).toBeInTheDocument()
    expect(screen.getByText("Sources checked 2026-07-10")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View company" })).toHaveAttribute(
      "href",
      "/companies/runwhen",
    )
  })
})
