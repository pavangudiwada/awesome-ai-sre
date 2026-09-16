import Link from "next/link"
import { BookmarkIcon, FolderPlusIcon, RssIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PRIVATE_WORKFLOWS_AVAILABLE } from "@/lib/features"
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
  privateWorkflowsAvailable?: boolean
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
  privateWorkflowsAvailable = PRIVATE_WORKFLOWS_AVAILABLE,
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
        aria-label={privateWorkflowsAvailable ? baseSaveLabel : `${baseSaveLabel} — coming soon`}
        title={privateWorkflowsAvailable ? baseSaveLabel : "Saving products is coming soon"}
        disabled={!privateWorkflowsAvailable}
      >
        <BookmarkIcon data-icon="inline-start" fill={saved ? "currentColor" : "none"} />
        {privateWorkflowsAvailable
          ? saved ? "Saved" : "Save product"
          : "Save product — coming soon"}
      </Button>
    </form>
  )
  const evaluationControl = privateWorkflowsAvailable ? (
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
  ) : (
    <Button
      type="button"
      variant={evaluationVariant}
      className={cn("h-11", orientation === "vertical" && "w-full")}
      aria-label={`${evaluationAriaLabel ?? `Add ${productName} to evaluation`} — coming soon`}
      title="Private evaluations are coming soon"
      disabled
    >
      <FolderPlusIcon data-icon="inline-start" />
      Add to evaluation — coming soon
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
  privateWorkflowsAvailable?: boolean
}

export function CompanyFollowAction({
  companySlug,
  companyName,
  following,
  action,
  privateWorkflowsAvailable = PRIVATE_WORKFLOWS_AVAILABLE,
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
        aria-label={privateWorkflowsAvailable ? label : `${label} — coming soon`}
        title={privateWorkflowsAvailable ? label : "Following companies is coming soon"}
        disabled={!privateWorkflowsAvailable}
      >
        <RssIcon data-icon="inline-start" />
        {privateWorkflowsAvailable
          ? following ? "Following company" : "Follow company"
          : "Follow company — coming soon"}
      </Button>
    </form>
  )
}
