import Link from "next/link"
import { BookmarkIcon, FolderPlusIcon, RssIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { ServerFormAction } from "./types"

interface ProfileProductActionsProps {
  productSlug: string
  productName: string
  saved: boolean
  saveAction: ServerFormAction
  evaluationHref: string
  returnTo?: string
}

export function ProfileProductActions({
  productSlug,
  productName,
  saved,
  saveAction,
  evaluationHref,
  returnTo,
}: ProfileProductActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={saveAction}>
        <input type="hidden" name="productSlug" value={productSlug} />
        <input type="hidden" name="saved" value={saved ? "false" : "true"} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <Button
          type="submit"
          variant={saved ? "secondary" : "outline"}
          className="h-11"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${productName} from saved` : `Save ${productName}`}
        >
          <BookmarkIcon data-icon="inline-start" fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save"}
        </Button>
      </form>
      <Button asChild variant="outline" className="h-11">
        <Link href={evaluationHref}>
          <FolderPlusIcon data-icon="inline-start" />
          Add to evaluation
        </Link>
      </Button>
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
  return (
    <form action={action}>
      <input type="hidden" name="companySlug" value={companySlug} />
      <input type="hidden" name="following" value={following ? "false" : "true"} />
      <Button
        type="submit"
        variant={following ? "secondary" : "outline"}
        className="h-11"
        aria-pressed={following}
        aria-label={following ? `Unfollow ${companyName}` : `Follow ${companyName}`}
      >
        <RssIcon data-icon="inline-start" />
        {following ? "Following company" : "Follow company"}
      </Button>
    </form>
  )
}
