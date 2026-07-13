import { describe, expect, it } from "vitest"

import {
  evidenceStatusLabel,
  getInitials,
  visibleProductBadges,
} from "./utils"

describe("watchlist UI utilities", () => {
  it("creates deterministic logo initials", () => {
    expect(getInitials("Better Stack")).toBe("BS")
    expect(getInitials("HolmesGPT")).toBe("HO")
    expect(getInitials("  ")).toBe("?")
  })

  it("caps product badges at the card density limit", () => {
    const badges = ["AI SRE", "OSS", "Self-hosted", "Kubernetes"].map(
      (label) => ({ label })
    )

    expect(visibleProductBadges(badges)).toHaveLength(3)
    expect(visibleProductBadges(badges, 2).map(({ label }) => label)).toEqual([
      "AI SRE",
      "OSS",
    ])
  })

  it("uses evidence labels that disclose provenance", () => {
    expect(evidenceStatusLabel("vendor-claimed")).toBe("Vendor claim")
    expect(evidenceStatusLabel("unknown")).toBe("Unknown")
  })
})
