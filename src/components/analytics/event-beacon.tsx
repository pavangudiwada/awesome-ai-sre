"use client"

import { useEffect, type ComponentProps } from "react"

type PublicEventPayload =
  | {
      event: "profile_view"
      subjectKind: "product" | "company"
      subjectSlug: string
    }
  | {
      event: "outbound_click"
      subjectKind: "product" | "company" | "update"
      subjectSlug: string
    }
  | {
      event: "update_view"
      subjectKind: "update"
      subjectSlug: string
    }
  | {
      event: "share"
      subjectKind: "product"
      subjectSlug: string
    }

type PublicEventTransportPayload = {
  event: PublicEventPayload["event"]
  subjectKind: PublicEventPayload["subjectKind"]
  subjectSlug: string
}

function sendEvent(payload: PublicEventTransportPayload) {
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Analytics must never block or alter the public research experience.
  })
}

/**
 * Records only that a public product profile was shared. The destination,
 * share text, copied URL, and browser/user identity are intentionally absent.
 */
export function trackProductShare(subjectSlug: string) {
  sendEvent({ event: "share", subjectKind: "product", subjectSlug })
}

export function PublicEventBeacon({ payload }: { payload: PublicEventPayload }) {
  const { event, subjectKind, subjectSlug } = payload

  useEffect(() => {
    sendEvent({ event, subjectKind, subjectSlug })
  }, [event, subjectKind, subjectSlug])

  return null
}

interface TrackedOutboundAnchorProps extends ComponentProps<"a"> {
  payload: Omit<
    Extract<PublicEventPayload, { event: "outbound_click" }>,
    "event"
  >
}

export function TrackedOutboundAnchor({
  payload,
  onClick,
  ...props
}: TrackedOutboundAnchorProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        sendEvent({ event: "outbound_click", ...payload })
        onClick?.(event)
      }}
    />
  )
}
