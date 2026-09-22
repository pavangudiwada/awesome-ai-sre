import Link from "next/link"
import { BookmarkIcon, FolderPlusIcon, RssIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ServerFormAction } from "./types"

interface ProfileProductActionsProps {
  productSlug: string
  productName: string
  saved: boolean
  saveAction: ServerFormAction
  evaluationHref: string
  returnTo?: string
  orientation?: "horizontal" | "vertical"
  evaluationFirst?: boolean
  evaluationVariant?: "default" | "outline"
  evaluationAriaLabel?: string
  saveAriaLabel?: string
}

export function ProfileProductActions({
  productSlug,
  productName,
  saved,
  saveAction,
  evaluationHref,
  returnTo,
  orientation = "horizontal",
  evaluationFirst = false,
  evaluationVariant = "outline",
  evaluationAriaLabel,
  saveAriaLabel,
}: ProfileProductActionsProps) {
  const baseSaveLabel =
    saveAriaLabel ??
    (saved ? `Remove ${productName} from saved` : `Save ${productName}`)
  const saveControl = (
    <form action={saveAction} className={cn(orientation === "vertical" && "w-full")}>
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="saved" value={saved ? "false" : "true"} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Button
        type="submit"
        variant={saved ? "secondary" : "outline"}
        className={cn("h-11", orientation === "vertical" && "w-full")}
        aria-pressed={saved}
        aria-label={baseSaveLabel}
        title={baseSaveLabel}
      >
        <BookmarkIcon data-icon="inline-start" fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save product"}
      </Button>
    </form>
  )
  const evaluationControl = (
    <Button
      asChild
      variant={evaluationVariant}
      className={cn("h-11", orientation === "vertical" && "w-full")}
    >
      <Link href={evaluationHref} aria-label={evaluationAriaLabel}>
        <FolderPlusIcon data-icon="inline-start" />
        Add to evaluation
      </Link>
    </Button>
  )

  return (
    <div
      className={cn(
        "flex gap-2",
        orientation === "vertical" ? "w-full flex-col" : "flex-wrap",
      )}
    >
      {evaluationFirst ? evaluationControl : saveControl}
      {evaluationFirst ? saveControl : evaluationControl}
    </div>
  )
}

interface CompanyFollowActionProps {
  companySlug: string
  companyName: string
  following: boolean
  action: ServerFormAction
}

export function CompanyFollowAction({
  companySlug,
  companyName,
  following,
  action,
}: CompanyFollowActionProps) {
  const label = following ? `Unfollow ${companyName}` : `Follow ${companyName}`

  return (
    <form action={action}>
      <input type="hidden" name="companySlug" value={companySlug} />
      <input type="hidden" name="followed" value={following ? "false" : "true"} />
      <Button
        type="submit"
        variant={following ? "secondary" : "outline"}
        className="h-11"
        aria-pressed={following}
        aria-label={label}
        title={label}
      >
        <RssIcon data-icon="inline-start" />
        {following ? "Following company" : "Follow company"}
      </Button>
    </form>
  )
}
