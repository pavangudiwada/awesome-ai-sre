import type { ReactNode } from "react"

export type ServerFormAction = (
  formData: FormData
) => void | Promise<void>

export type BadgeTone = "default" | "secondary" | "outline" | "destructive"

export interface WatchlistNavItem {
  label: string
  href: string
  active?: boolean
}

export interface WatchlistViewer {
  displayName: string
  email?: string
  avatarUrl?: string | null
  workspaceHref?: string
  settingsHref?: string
  signOutAction?: ServerFormAction
}

export interface WatchlistNotification {
  id: string
  title: string
  summary?: string
  href: string
  publishedAtLabel: string
  unread?: boolean
  source: "watchlist" | "followed-company"
  companyName?: string
}

export interface MarketplaceCategory {
  value: string
  label: string
  count?: number
}

export interface FilterChoice {
  value: string
  label: string
  count?: number
}

export interface FilterSection {
  id: string
  label: string
  kind: "single" | "multiple"
  options: FilterChoice[]
}

export interface AppliedFilter {
  id: string
  label: string
  onRemove?: () => void
}

export interface SortOption {
  value: string
  label: string
}

export interface ProductBadge {
  label: string
  tone?: BadgeTone
}

export interface ProductSummary {
  slug: string
  name: string
  href: string
  summary: string
  companyName?: string
  companyHref?: string
  logoSrc?: string | null
  screenshotSrc?: string | null
  screenshotAlt?: string
  badges?: ProductBadge[]
  lastReviewedLabel?: string
}

export interface ProductFact {
  label: string
  value: ReactNode
  detail?: string
}

export type EvidenceStatus =
  | "documented"
  | "vendor-claimed"
  | "observed"
  | "unknown"

export interface EvidenceClaim {
  id: string
  claim: string
  detail?: string
  status: EvidenceStatus
  sourceCount?: number
  lastCheckedLabel?: string
  sourceHref?: string
}

export interface SourceReference {
  id: string
  title: string
  publisher?: string
  href: string
  sourceType?: string
  accessedAtLabel?: string
}

export interface WorkspaceNavItem {
  value: string
  label: string
  href: string
  count?: number
}

export interface AuthBenefit {
  title: string
  description: string
  icon?: ReactNode
}
