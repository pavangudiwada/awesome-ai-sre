"use client"

import { useMemo, useSyncExternalStore } from "react"
import {
  BookOpenIcon,
  Code2Icon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  RocketIcon,
  Share2Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  TrackedOutboundAnchor,
  trackProductShare,
} from "@/components/analytics/event-beacon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type {
  ProductResourceKind,
  ProductResourceLink,
} from "@/types/catalog"

export type ProfileShareDestination =
  | "copy"
  | "native"
  | "linkedin"
  | "x"
  | "email"

export interface ProfileSharingCardProps {
  productName: string
  productSlug?: string
  canonicalUrl: string
  description?: string
  onShare?: (destination: ProfileShareDestination) => void
}

export interface OfficialResourcesCardProps {
  productName: string
  productSlug: string
  resources: readonly ProductResourceLink[]
}

export interface ProfileShareUrls {
  canonical: string
  linkedin: string
  x: string
  email: string
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

export function buildProfileShareUrls({
  canonicalUrl,
  title,
  description,
}: {
  canonicalUrl: string
  title: string
  description: string
}): ProfileShareUrls | null {
  const canonical = safeHttpUrl(canonicalUrl)
  if (!canonical) return null

  const linkedin = new URL("https://www.linkedin.com/sharing/share-offsite/")
  linkedin.searchParams.set("url", canonical)

  const x = new URL("https://x.com/intent/tweet")
  x.searchParams.set("url", canonical)
  x.searchParams.set("text", description)

  const email = new URL("mailto:")
  email.searchParams.set("subject", title)
  email.searchParams.set("body", `${description}\n\n${canonical}`)

  return {
    canonical,
    linkedin: linkedin.href,
    x: x.href,
    email: email.href,
  }
}

async function copyToClipboard(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable")
  }
  await navigator.clipboard.writeText(value)
}

const subscribeToBrowserCapabilities = () => () => undefined
const getNativeShareSnapshot = () => typeof navigator.share === "function"
const getServerNativeShareSnapshot = () => false

const resourceIcons: Record<ProductResourceKind, LucideIcon> = {
  website: GlobeIcon,
  linkedin: UsersIcon,
  x: MessageCircleIcon,
  github: Code2Icon,
  producthunt: RocketIcon,
  documentation: BookOpenIcon,
  community: MessagesSquareIcon,
}

export function ProfileSharingCard({
  productName,
  productSlug,
  canonicalUrl,
  description,
  onShare,
}: ProfileSharingCardProps) {
  const nativeShareAvailable = useSyncExternalStore(
    subscribeToBrowserCapabilities,
    getNativeShareSnapshot,
    getServerNativeShareSnapshot,
  )
  const title = `${productName} | AI SRE Watchlist`
  const shareText =
    description ??
    `Evaluating ${productName}? Review its capabilities, deployment details, and source-linked evidence on AI SRE Watchlist.`
  const shareUrls = useMemo(
    () => buildProfileShareUrls({ canonicalUrl, title, description: shareText }),
    [canonicalUrl, shareText, title],
  )

  if (!shareUrls) return null
  const resolvedShareUrls = shareUrls

  function recordCompletedShare(destination: ProfileShareDestination) {
    if (productSlug) trackProductShare(productSlug)
    onShare?.(destination)
  }

  async function handleCopy() {
    try {
      await copyToClipboard(resolvedShareUrls.canonical)
      toast.success("Profile link copied")
      recordCompletedShare("copy")
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar.")
    }
  }

  async function handlePrimaryShare() {
    if (!nativeShareAvailable) {
      await handleCopy()
      return
    }

    try {
      await navigator.share({
        title,
        text: shareText,
        url: resolvedShareUrls.canonical,
      })
      recordCompletedShare("native")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.error("Sharing did not open. Copy the profile link instead.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Share {productName}
        </CardTitle>
        <CardDescription>
          Know an SRE evaluating {productName}? Send them this source-linked profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button className="h-11 w-full" onClick={handlePrimaryShare}>
          <Share2Icon data-icon="inline-start" />
          Share profile
        </Button>

        <Separator />
        <p className="text-sm font-medium">Share another way</p>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <a
              href={resolvedShareUrls.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share ${productName} on LinkedIn (opens in a new tab)`}
              onClick={() => recordCompletedShare("linkedin")}
            >
              <UsersIcon data-icon="inline-start" />
              LinkedIn
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a
              href={resolvedShareUrls.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share ${productName} on X (opens in a new tab)`}
              onClick={() => recordCompletedShare("x")}
            >
              <MessageCircleIcon data-icon="inline-start" />
              X
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a
              href={resolvedShareUrls.email}
              aria-label={`Share ${productName} by email (opens your email app)`}
              onClick={() => recordCompletedShare("email")}
            >
              <MailIcon data-icon="inline-start" />
              Email
            </a>
          </Button>
          <Button variant="outline" className="h-11" onClick={handleCopy}>
            <CopyIcon data-icon="inline-start" />
            Copy link
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function OfficialResourcesCard({
  productName,
  productSlug,
  resources: resourceLinks,
}: OfficialResourcesCardProps) {
  const resources = resourceLinks.flatMap((resource) => {
    const href = safeHttpUrl(resource.href)
    return href ? [{ ...resource, href, icon: resourceIcons[resource.kind] }] : []
  })

  if (!resources.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Official resources
        </CardTitle>
        <CardDescription>
          Cataloged first-party destinations. These links are not independent evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {resources.map(({ kind, label, icon: Icon, href }) => (
          <Button
            key={`${kind}-${href}`}
            asChild
            variant="outline"
            className="h-11 justify-start"
          >
            <TrackedOutboundAnchor
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              payload={{
                subjectKind: "product",
                subjectSlug: productSlug,
              }}
              aria-label={`Open ${label} for ${productName} (opens in a new tab)`}
            >
              <Icon data-icon="inline-start" />
              {label}
              <ExternalLinkIcon data-icon="inline-end" />
            </TrackedOutboundAnchor>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
