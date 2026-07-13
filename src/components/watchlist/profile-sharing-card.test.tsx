import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildProfileShareUrls,
  OfficialResourcesCard,
  ProfileSharingCard,
} from "./profile-sharing-card"

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: toastMocks }))

const canonicalUrl = "https://aisre.pavangudiwada.dev/tools/holmesgpt"

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
}

function setNativeShare(share?: (data: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  })
}

afterEach(() => {
  toastMocks.success.mockReset()
  toastMocks.error.mockReset()
  setClipboard(vi.fn().mockRejectedValue(new Error("Clipboard unavailable")))
  setNativeShare(undefined)
})

describe("buildProfileShareUrls", () => {
  it("encodes the canonical URL and concise copy in known share endpoints", () => {
    const urls = buildProfileShareUrls({
      canonicalUrl,
      title: "HolmesGPT | AI SRE Watchlist",
      description: "Review evidence before your pilot.",
    })

    expect(urls).not.toBeNull()
    expect(new URL(urls!.linkedin).searchParams.get("url")).toBe(canonicalUrl)
    expect(new URL(urls!.x).origin).toBe("https://x.com")
    expect(new URL(urls!.x).searchParams.get("text")).toBe(
      "Review evidence before your pilot.",
    )
    expect(new URL(urls!.email).searchParams.get("subject")).toBe(
      "HolmesGPT | AI SRE Watchlist",
    )
    expect(new URL(urls!.email).searchParams.get("body")).toBe(
      `Review evidence before your pilot.\n\n${canonicalUrl}`,
    )
  })

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://user:password@example.com/tools/example",
    "/tools/relative-path",
  ])("rejects an unsafe or non-canonical profile URL: %s", (unsafeUrl) => {
    expect(
      buildProfileShareUrls({
        canonicalUrl: unsafeUrl,
        title: "Unsafe profile",
        description: "Unsafe profile",
      }),
    ).toBeNull()
  })
})

describe("ProfileSharingCard", () => {
  it("keeps the primary and alternate share actions visible in the card", () => {
    render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl={canonicalUrl}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Share HolmesGPT", level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Share profile" })).toHaveClass(
      "h-11",
      "w-full",
    )
    expect(
      screen.getByRole("link", {
        name: "Share HolmesGPT on LinkedIn (opens in a new tab)",
      }),
    ).toHaveAttribute("target", "_blank")
    expect(
      screen.getByRole("link", {
        name: "Share HolmesGPT on X (opens in a new tab)",
      }),
    ).toHaveAttribute("target", "_blank")
    expect(
      screen.getByRole("link", {
        name: "Share HolmesGPT by email (opens your email app)",
      }),
    ).not.toHaveAttribute("target")
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible()
  })

  it("uses the native share sheet with exactly the canonical payload", async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    const onShare = vi.fn()
    setNativeShare(share)

    render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl={canonicalUrl}
        onShare={onShare}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Share profile" }))

    expect(share).toHaveBeenCalledWith({
      title: "HolmesGPT | AI SRE Watchlist",
      text: "Evaluating HolmesGPT? Review its capabilities, deployment details, and source-linked evidence on AI SRE Watchlist.",
      url: canonicalUrl,
    })
    expect(onShare).toHaveBeenCalledWith("native")
  })

  it("falls back to copying when native share is unavailable", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const onShare = vi.fn()
    setClipboard(writeText)

    render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl={canonicalUrl}
        onShare={onShare}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Share profile" }))

    expect(writeText).toHaveBeenCalledWith(canonicalUrl)
    expect(toastMocks.success).toHaveBeenCalledWith("Profile link copied")
    expect(onShare).toHaveBeenCalledWith("copy")
  })

  it("reports copy failures without recording a completed share", async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    setClipboard(vi.fn().mockRejectedValue(new Error("Permission denied")))

    render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl={canonicalUrl}
        onShare={onShare}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Copy link" }))

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Couldn't copy the link. Copy it from the address bar.",
    )
    expect(onShare).not.toHaveBeenCalled()
  })

  it("treats cancelling the native share sheet as a non-event", async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    setNativeShare(
      vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
    )

    render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl={canonicalUrl}
        onShare={onShare}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Share profile" }))

    expect(toastMocks.error).not.toHaveBeenCalled()
    expect(onShare).not.toHaveBeenCalled()
  })

  it("does not render a share surface for an unsafe canonical URL", () => {
    const { container } = render(
      <ProfileSharingCard
        productName="HolmesGPT"
        canonicalUrl="javascript:alert(1)"
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe("OfficialResourcesCard", () => {
  it("renders safe catalog resources in order and omits unsafe destinations", () => {
    render(
      <OfficialResourcesCard
        productName="HolmesGPT"
        productSlug="holmesgpt"
        resources={[
          {
            kind: "website",
            label: "Official website",
            href: "https://holmesgpt.dev",
          },
          {
            kind: "linkedin",
            label: "LinkedIn",
            href: "javascript:alert(1)",
          },
          {
            kind: "github",
            label: "GitHub",
            href: "https://github.com/HolmesGPT/holmesgpt",
          },
        ]}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Official resources", level: 2 }),
    ).toBeInTheDocument()
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAccessibleName(
      "Open Official website for HolmesGPT (opens in a new tab)",
    )
    expect(links[1]).toHaveAccessibleName(
      "Open GitHub for HolmesGPT (opens in a new tab)",
    )
    expect(links[1]).toHaveAttribute("rel", "noopener noreferrer")
  })
})
