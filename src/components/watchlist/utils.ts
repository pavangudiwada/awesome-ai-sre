import type { BadgeTone, EvidenceStatus, ProductBadge } from "./types"

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

export function visibleProductBadges(
  badges: ProductBadge[] | undefined,
  maximum = 3
): ProductBadge[] {
  return (badges ?? []).slice(0, Math.max(0, maximum))
}

export function evidenceStatusLabel(status: EvidenceStatus): string {
  const labels: Record<EvidenceStatus, string> = {
    documented: "Documented",
    "vendor-claimed": "Vendor claim",
    observed: "Watchlist observed",
    unknown: "Unknown",
  }

  return labels[status]
}

export function evidenceStatusTone(status: EvidenceStatus): BadgeTone {
  const tones: Record<EvidenceStatus, BadgeTone> = {
    documented: "secondary",
    "vendor-claimed": "outline",
    observed: "default",
    unknown: "outline",
  }

  return tones[status]
}
