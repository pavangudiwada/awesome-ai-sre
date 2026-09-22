import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EvidenceExplorer, ProductSectionNav } from "./product-detail-interactions"

describe("Product detail interactions", () => {
  it("hides empty evidence and its navigation item", () => {
    const { container } = render(
      <>
        <ProductSectionNav hasCapabilities={false} evidenceCount={0} sourceCount={0} />
        <EvidenceExplorer claims={[]} productSlug="example" />
      </>,
    )

    expect(screen.getByRole("link", { name: "Summary" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /evidence/i })).not.toBeInTheDocument()
    expect(container.querySelector("[role=alert]")).toBeNull()
  })
})
