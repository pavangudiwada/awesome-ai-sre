import Link from "next/link"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BrandLockup } from "./brand-lockup"

describe("Open Lens lockup", () => {
  it("uses the original compact light and dark artwork at its intended size", () => {
    const { container } = render(<Link href="/" aria-label="AI SRE Watchlist home"><BrandLockup /></Link>)
    expect(screen.getByRole("link", { name: "AI SRE Watchlist home" })).toHaveAttribute("href", "/")
    const images = container.querySelectorAll("img")
    expect(images).toHaveLength(2)
    for (const [index, image] of Array.from(images).entries()) {
      expect(image).toHaveAttribute("src", `/brand/header-wordmark-${index === 0 ? "light" : "dark"}.svg`)
      expect(image).toHaveAttribute("width", "176")
      expect(image).toHaveAttribute("height", "40")
      expect(image).toHaveAttribute("alt", "")
    }
    expect(container.querySelector("[data-brand]")).toHaveClass("p-3")
  })

  it("uses the standalone symbol rather than shrinking the wordmark on mobile", () => {
    const { container } = render(<BrandLockup compactOnMobile />)
    const marks = container.querySelectorAll('img[src^="/brand/mark-"]')
    expect(marks).toHaveLength(2)
    for (const mark of marks) expect(mark).toHaveAttribute("width", "40")
    expect(marks[0].parentElement).toHaveClass("sm:hidden")
    expect(container.querySelector('img[src="/brand/header-wordmark-light.svg"]')?.parentElement).toHaveClass("hidden", "sm:block")
  })
})
