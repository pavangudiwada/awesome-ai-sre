import { useState } from "react"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { CommandDialog } from "./command"

const title = "Search the AI SRE Watchlist"
const description = "Search tools, companies, and research resources."

afterEach(cleanup)

describe("command dialog accessibility", () => {
  it("does not render dialog-only labels while closed", () => {
    render(<CommandDialog open={false} title={title} description={description}>Search content</CommandDialog>)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText(title)).not.toBeInTheDocument()
    expect(screen.queryByText(description)).not.toBeInTheDocument()
  })

  it("keeps its accessible name and description inside the modal and removes them after Escape", async () => {
    function Palette() {
      const [open, setOpen] = useState(true)
      return <CommandDialog open={open} onOpenChange={setOpen} title={title} description={description} showCloseButton>Search content</CommandDialog>
    }
    const user = userEvent.setup()
    render(<Palette />)

    const dialog = screen.getByRole("dialog", { name: title })
    expect(dialog).toHaveAccessibleDescription(description)
    const heading = within(dialog).getByRole("heading", { name: title })
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id)
    expect(dialog).toHaveAttribute("aria-describedby", within(dialog).getByText(description).id)

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText(title)).not.toBeInTheDocument()
    expect(screen.queryByText(description)).not.toBeInTheDocument()
  })
})
