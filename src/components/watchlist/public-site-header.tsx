"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";

import { signOut } from "@/actions/auth";
import { markUpdateReadAction } from "@/actions/workflows";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().max(2_000).optional(),
  href: z.union([
    z.string().regex(/^\/updates\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
    z.string().url().refine((value) => new URL(value).protocol === "https:"),
  ]),
  publishedAtLabel: z.string().min(1).max(100),
  unread: z.boolean().optional(),
  source: z.enum(["watchlist", "followed-company"]),
  companyName: z.string().max(200).optional(),
});

const headerStateSchema = z.object({
  viewer: viewerSchema.nullable(),
  notifications: z.array(notificationSchema).max(12),
});

type HeaderPayload = z.infer<typeof headerStateSchema>;
type HydrationStatus = "loading" | "ready" | "unavailable";

export function PublicSiteHeader({
  searchItems = [],
}: {
  searchItems?: readonly WatchlistSearchItem[];
}) {
  const [state, setState] = useState<HeaderPayload | null>(null);
  const [status, setStatus] = useState<HydrationStatus>("loading");
  const [searchOpen, setSearchOpen] = useState(false);

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

  return (
    <>
      <SiteHeader
        viewer={viewer}
        notifications={notifications}
        accountPending={false}
        notificationsStatus={status}
        markNotificationReadAction={markUpdateReadAction}
        onSearchOpen={() => setSearchOpen(true)}
        onNotificationSelect={(selected) => {
          if (!selected.unread) return;
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
      {notifications[0] ? (
        <Alert className="mx-auto mt-3 max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-8">
          <AlertTitle>
            <Link href={notifications[0].href} className="hover:underline">
              Latest alert: {notifications[0].title}
            </Link>
          </AlertTitle>
          {notifications[0].summary ? (
            <AlertDescription>{notifications[0].summary}</AlertDescription>
          ) : null}
        </Alert>
      ) : null}
      <WatchlistSearch
        items={searchItems}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </>
  );
}
