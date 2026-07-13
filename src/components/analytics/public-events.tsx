import type { ComponentProps } from "react"

import {
  PublicEventBeacon,
  TrackedOutboundAnchor,
} from "./event-beacon"

type TrackedSubject = {
  kind: "product" | "company" | "update"
  slug: string
}

function analyticsIsConfigured() {
  return Boolean(
    process.env.DATABASE_URL && process.env.ANALYTICS_HASH_SECRET,
  )
}

export function PublicProfileView({ subject }: { subject: TrackedSubject }) {
  if (!analyticsIsConfigured()) return null

  const payload =
    subject.kind === "update"
      ? {
          event: "update_view" as const,
          subjectKind: "update" as const,
          subjectSlug: subject.slug,
        }
      : {
          event: "profile_view" as const,
          subjectKind: subject.kind,
          subjectSlug: subject.slug,
        }

  return <PublicEventBeacon payload={payload} />
}

interface TrackedOutboundLinkProps extends ComponentProps<"a"> {
  subject: TrackedSubject
}

export function TrackedOutboundLink({
  subject,
  ...props
}: TrackedOutboundLinkProps) {
  if (!analyticsIsConfigured()) return <a {...props} />

  return (
    <TrackedOutboundAnchor
      {...props}
      payload={{ subjectKind: subject.kind, subjectSlug: subject.slug }}
    />
  )
}
