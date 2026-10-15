"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { z } from "zod";

import { signOut } from "@/actions/auth";
import { markUpdateReadAction } from "@/actions/workflows";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isPersistedUpdateId, notificationIdSchema } from "@/lib/presentation/notification-id";

import { SiteHeader } from "./site-header";
import type { WatchlistNotification, WatchlistViewer } from "./types";
import {
  WatchlistSearch,
  type WatchlistSearchItem,
} from "./watchlist-search";

const viewerSchema = z.object({
  displayName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  avatarUrl: z.string().max(2_048).nullable().optional(),
  workspaceHref: z.literal("/workspace/saved").optional(),
  settingsHref: z.literal("/settings").optional(),
});

const notificationSchema = z.object({
  id: notificationIdSchema,
  title: z.string().min(1).max(500),
  summary: z.string().max(2_000).optional(),
  href: z.union([
    z.string().regex(/^\/updates\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
    z.string().url().refine((value) => new URL(value).protocol === "https:"),
  ]),
  publishedAtLabel: z.string().min(1).max(100),
  actualEventDateLabel: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  unread: z.boolean().optional(),
  source: z.enum(["watchlist", "followed-company"]),
  companyName: z.string().max(200).optional(),
}).refine((notification) => isPersistedUpdateId(notification.id) || notification.unread === undefined, {
  message: "File-only news cannot carry persisted read state",
});

const headerStateSchema = z.object({
  viewer: viewerSchema.nullable(),
  notifications: z.array(notificationSchema).max(12),
  publicationStatus: z.enum(["available", "unavailable", "partial"]).optional(),
  personalizationUnavailable: z.boolean().optional(),
});

type HeaderPayload = z.infer<typeof headerStateSchema>;
type HydrationStatus = "loading" | "ready" | "unavailable";

function dismissalStorageKey(notificationId: string) {
  return `watchlist:home-notice:dismissed:${notificationId}`;
}

function isNotificationDismissed(notificationId: string) {
  try {
    return window.localStorage.getItem(dismissalStorageKey(notificationId)) === "1";
  } catch {
    // Storage can be unavailable in private or restricted browser sessions.
    return false;
  }
}

export function PublicSiteHeader({
  searchItems = [],
}: {
  searchItems?: readonly WatchlistSearchItem[];
}) {
  const [state, setState] = useState<HeaderPayload | null>(null);
  const [status, setStatus] = useState<HydrationStatus>("loading");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateHeader() {
      try {
        const response = await fetch("/api/header-state", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Header state request failed");
        const result = headerStateSchema.safeParse(await response.json());
        if (!result.success) throw new Error("Header state response was invalid");
        // Read dismissal state before showing the fetched notice to avoid a flash on reload.
        setDismissedNotificationIds(new Set(
          result.data.notifications
            .filter((notification) => isNotificationDismissed(notification.id))
            .map((notification) => notification.id),
        ));
        setState(result.data);
        setStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("unavailable");
      }
    }

    void hydrateHeader();
    return () => controller.abort();
  }, []);

  const viewer: WatchlistViewer | null = state?.viewer
    ? { ...state.viewer, signOutAction: signOut }
    : null;
  const notifications = (state?.notifications ?? []) as WatchlistNotification[];
  const latestNotification = notifications[0];

  function dismissNotification(notificationId: string) {
    setDismissedNotificationIds((current) => new Set([...current, notificationId]));
    try {
      window.localStorage.setItem(dismissalStorageKey(notificationId), "1");
    } catch {
      // Closing the notice still works for this page when storage is unavailable.
    }
  }

  return (
    <>
      <SiteHeader
        viewer={viewer}
        notifications={notifications}
        accountPending={false}
        accountUnavailable={state?.personalizationUnavailable}
        notificationsStatus={status === "ready" && ((state?.publicationStatus && state.publicationStatus !== "available") || state?.personalizationUnavailable) ? "partial" : status}
        markNotificationReadAction={markUpdateReadAction}
        onSearchOpen={() => setSearchOpen(true)}
        onNotificationSelect={(selected) => {
          if (!selected.unread || !isPersistedUpdateId(selected.id)) return;
          setState((current) => {
            if (!current) return current;
            return {
              ...current,
              notifications: current.notifications.map((notification) =>
                notification.id === selected.id
                  ? { ...notification, unread: false }
                  : notification,
              ),
            };
          });
        }}
      />
      {latestNotification && !dismissedNotificationIds.has(latestNotification.id) ? (
        <div className="mx-auto mt-2 w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <Alert
            role="region"
            aria-label="Latest update"
            className="flex items-center gap-2 px-3 py-0"
          >
            <div className="min-w-0 flex-1 py-2 leading-5 [overflow-wrap:anywhere]">
              <AlertTitle className="inline">
                <Link
                  href={latestNotification.href}
                  className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {latestNotification.title}
                </Link>
              </AlertTitle>
              {latestNotification.summary ? (
                <AlertDescription className="inline text-pretty">
                  <span aria-hidden="true"> · </span>
                  {latestNotification.summary}
                </AlertDescription>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-2 size-11 self-start"
              aria-label="Dismiss latest update"
              onClick={() => dismissNotification(latestNotification.id)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </Alert>
        </div>
      ) : null}
      <WatchlistSearch
        items={searchItems}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </>
  );
}
