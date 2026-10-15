import type { ComponentProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"

import { SiteHeader } from "./site-header"

vi.mock("./public-project-links", () => ({ PublicProjectLinks: () => null }))

function renderHeader(
  props: ComponentProps<typeof SiteHeader> = {}
) {
  return render(
    <TooltipProvider>
      <SiteHeader {...props} />
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

  it("shows the complete platform shortcut", () => {
    renderHeader({ onSearchOpen: vi.fn() })

    expect(screen.getByText("Ctrl K")).toBeInTheDocument()
  })

  it("shows Command K on macOS", () => {
    const platform = vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel")
    renderHeader({ onSearchOpen: vi.fn() })
    expect(screen.getByText("⌘ K")).toBeInTheDocument()
    platform.mockRestore()
  })

  it("opens command search with Control K", () => {
    const onSearchOpen = vi.fn()
    renderHeader({ onSearchOpen })
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(onSearchOpen).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Search tools and resources" })).toHaveAttribute("aria-keyshortcuts", "Control+k Meta+k")
  })

  it("does not advertise a shortcut for the workspace navigation fallback", () => {
    renderHeader()
    expect(screen.queryByText("Ctrl K")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Search tools and resources" })).not.toHaveAttribute("aria-keyshortcuts")
  })

  it("exposes sign-up and sign-in through the shared auth route", () => {
    renderHeader()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in")
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-in")
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

  it("groups the public company directory and glossary under Resources", () => {
    renderHeader()

    expect(screen.queryByRole("link", { name: "Companies" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Resources" }))
    expect(screen.getByRole("link", { name: "Glossary" })).toHaveAttribute("href", "/glossary")
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

  it("never marks file-only news read or gives it an unread badge even if malformed props request one", () => {
    const markNotificationReadAction = vi.fn()
    renderHeader({
      notifications: [{ id: "news:acme-funding", title: "Acme funding", href: "https://example.com/news", publishedAtLabel: "Announced Oct 9, 2026", unread: true, source: "watchlist" }],
      markNotificationReadAction,
    })
    fireEvent.click(screen.getAllByLabelText("Open updates")[0])
    const updateLink = screen.getByRole("link", { name: /Acme funding/ })
    updateLink.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(updateLink)
    expect(markNotificationReadAction).not.toHaveBeenCalled()
    expect(screen.queryByText("New")).not.toBeInTheDocument()
  })

  it("keeps public news visible while publication or personalization state is partial", () => {
    renderHeader({
      notifications: [{ id: "news:acme-funding", title: "Acme funding", href: "https://example.com/news", publishedAtLabel: "Announced Oct 9, 2026", source: "watchlist" }],
      notificationsStatus: "partial", accountUnavailable: true,
    })
    expect(screen.getByLabelText("Account temporarily unavailable")).toBeDisabled()
    fireEvent.click(screen.getAllByLabelText("Open updates")[0])
    expect(screen.getByRole("link", { name: /Acme funding/ })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Public news remains available")
    expect(screen.getByRole("link", { name: "View all Global Updates" })).toHaveAttribute("href", "/updates")
  })

  it("visibly distinguishes followed-company public news without requiring unread state", () => {
    renderHeader({ notifications: [{ id: "news:aws-update", title: "AWS update", href: "https://example.com/news", publishedAtLabel: "Announced Oct 9, 2026", source: "followed-company", companyName: "Amazon Web Services" }] })
    fireEvent.click(screen.getAllByLabelText("Open updates")[0])
    expect(screen.getByText("Followed company", { exact: true })).toBeInTheDocument()
    expect(screen.getByText(/Amazon Web Services/)).toBeInTheDocument()
    expect(screen.queryByText("New")).not.toBeInTheDocument()
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
