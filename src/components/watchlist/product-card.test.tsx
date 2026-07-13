import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ProductCard } from "./product-card"
import type { ProductSummary } from "./types"

const product: ProductSummary = {
  slug: "holmesgpt",
  name: "HolmesGPT",
  href: "/tools/holmesgpt",
  companyName: "Robusta.dev",
  companyHref: "/companies/robusta-dev",
  summary: "An open-source AI agent for investigating production incidents.",
  badges: [
    { label: "Incident AI" },
    { label: "Open source" },
    { label: "Self-hosted" },
    { label: "Kubernetes" },
  ],
  lastReviewedLabel: "July 10, 2026",
}

describe("ProductCard", () => {
  it("caps badges and exposes one explicit save action", () => {
    render(<ProductCard product={product} onSaveChange={() => undefined} />)

    expect(screen.getByText("Incident AI")).toBeInTheDocument()
    expect(screen.getByText("Open source")).toBeInTheDocument()
    expect(screen.getByText("Self-hosted")).toBeInTheDocument()
    expect(screen.queryByText("Kubernetes")).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Save HolmesGPT" })).toHaveLength(1)
  })

  it("reports the next saved state without conflating it with follow", async () => {
    const user = userEvent.setup()
    const onSaveChange = vi.fn()

    render(<ProductCard product={product} onSaveChange={onSaveChange} />)
    await user.click(screen.getByRole("button", { name: "Save HolmesGPT" }))

    expect(onSaveChange).toHaveBeenCalledWith(product, true)
    expect(screen.queryByText(/follow/i)).not.toBeInTheDocument()
  })
})
