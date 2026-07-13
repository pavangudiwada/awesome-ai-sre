import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/workflows", () => ({
  submitEditorialAction: vi.fn(),
}))

import { EditorialSubmissionForm } from "./editorial-submission-form"

describe("EditorialSubmissionForm composition", () => {
  it.each([
    ["correction", "Submit a correction"],
    ["company_update", "Submit a company update"],
  ] as const)("uses the shared accessible form for %s", (type, title) => {
    render(
      <EditorialSubmissionForm
        type={type}
        companies={[]}
        products={[]}
      />,
    )

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText("Submission subject")).toBeInTheDocument()
    expect(screen.getByLabelText("Your relationship")).toBeRequired()
    expect(screen.getByLabelText("Primary source URL")).toHaveAttribute(
      "type",
      "url",
    )
    expect(screen.getByRole("button", { name: "Send for review" })).toHaveClass(
      "h-11",
    )
  })
})
