import type { ComponentProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"

import { SiteHeader } from "./site-header"

function renderHeader(
  props: ComponentProps<typeof SiteHeader> = {}
) {
  return render(
    <TooltipProvider>
      <SiteHeader privateWorkflowsAvailable {...props} />
    </TooltipProvider>
  )
}

describe("SiteHeader", () => {
  it("does not manufacture an unread state when no updates are supplied", () => {
    renderHeader()

    expect(screen.getAllByLabelText("Open updates")).toHaveLength(2)
    expect(screen.queryByText("New")).not.toBeInTheDocument()
  })

  it("uses neutral accessible states while public personalization hydrates", () => {
    renderHeader({ accountPending: true, notificationsStatus: "loading" })

    expect(screen.getByLabelText("Loading account")).toBeDisabled()
    fireEvent.click(screen.getAllByLabelText("Open updates")[0])
    expect(screen.getByRole("status")).toHaveTextContent("Loading updates")
  })

  it("opens command search from the keyboard when a handler is available", () => {
    const onSearchOpen = vi.fn()
    renderHeader({ onSearchOpen })

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    expect(onSearchOpen).toHaveBeenCalledTimes(1)
  })

  it("shows the complete Command K shortcut", () => {
    renderHeader({ onSearchOpen: vi.fn() })

    expect(screen.getByText("K")).toBeInTheDocument()
  })

  it("keeps private launch features visible but disabled", () => {
    renderHeader({ privateWorkflowsAvailable: false })

    expect(screen.getByRole("status")).toHaveTextContent("More features are coming soon")
    expect(screen.getByRole("button", { name: "Updates coming soon" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Sign in coming soon" })).toBeDisabled()
    expect(screen.getByText("Sign in soon")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
  })

  it("opens command search when the header search button is clicked", () => {
    const onSearchOpen = vi.fn()
    renderHeader({ onSearchOpen })

    fireEvent.click(screen.getByRole("button", { name: "Search tools and resources" }))
    expect(onSearchOpen).toHaveBeenCalledTimes(1)
  })

  it("uses the shadcn navigation menu and preserves active links", () => {
    const { container } = renderHeader({
      navItems: [{ label: "Tools", href: "/tools", active: true }],
    })

    expect(
      container.querySelector('[data-slot="navigation-menu"]')
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole("link", { name: "Tools" })) {
      expect(link).toHaveAttribute("href", "/tools")
      expect(link).toHaveAttribute("aria-current", "page")
    }
  })

  it("includes the public company directory in navigation", () => {
    renderHeader()

    const companyLinks = screen.getAllByRole("link", { name: "Companies" })
    expect(companyLinks).toHaveLength(1)
    for (const link of companyLinks) {
      expect(link).toHaveAttribute("href", "/companies")
    }
  })

  it.each([
    ["desktop popover", 0],
    ["mobile sheet", 1],
  ])("opens updates from the %s trigger", (_, triggerIndex) => {
    renderHeader()

    fireEvent.click(screen.getAllByLabelText("Open updates")[triggerIndex])

    expect(screen.getByText("No updates yet")).toBeInTheDocument()
  })

  it("marks a real unread update only after it is selected", () => {
    const markNotificationReadAction = vi.fn()
    renderHeader({
      notifications: [
        {
          id: "3f7859d3-63da-4f95-857c-8225a3085af8",
          title: "RunWhen update",
          href: "/updates/runwhen-update",
          publishedAtLabel: "Jul 10, 2026",
          unread: true,
          source: "followed-company",
          companyName: "RunWhen",
        },
      ],
      markNotificationReadAction,
    })

    fireEvent.click(screen.getAllByLabelText("Open updates, 1 unread")[0])
    const updateLink = screen.getByRole("link", { name: /RunWhen update/ })
    updateLink.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(updateLink)

    expect(markNotificationReadAction).toHaveBeenCalledTimes(1)
    const formData = markNotificationReadAction.mock.calls[0]?.[0] as FormData
    expect(formData.get("updateId")).toBe("3f7859d3-63da-4f95-857c-8225a3085af8")
  })
})
