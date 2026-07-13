import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthPanel } from "./auth-panel"

const formAction = () => undefined

describe("AuthPanel form composition", () => {
  it("groups provider choices and keeps every primary target at least 44px tall", () => {
    render(
      <AuthPanel
        magicLinkAction={formAction}
        googleAction={formAction}
        githubAction={formAction}
        nextPath="/workspace/saved"
      />,
    )

    expect(screen.getByText("Sign-in providers")).toBeInTheDocument()
    expect(screen.getByText("or use email")).toBeInTheDocument()
    expect(screen.getByLabelText("Work email")).toHaveAttribute(
      "autocomplete",
      "email",
    )

    for (const name of [
      "Continue with Google",
      "Continue with GitHub",
      "Email me a sign-in link",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveClass("h-11")
    }
  })

  it("uses accessible alerts for server feedback", () => {
    render(
      <AuthPanel
        magicLinkAction={formAction}
        errorMessage="The link expired."
        successMessage="A new link was sent."
      />,
    )

    expect(screen.getByText("Sign-in failed")).toBeInTheDocument()
    expect(screen.getByText("The link expired.")).toBeInTheDocument()
    expect(screen.getByText("Check your email")).toBeInTheDocument()
    expect(screen.getByText("A new link was sent.")).toBeInTheDocument()
  })
})
