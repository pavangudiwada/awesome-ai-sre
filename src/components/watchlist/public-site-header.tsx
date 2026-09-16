"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

import { signOut } from "@/actions/auth";
import { markUpdateReadAction } from "@/actions/workflows";

import { SiteHeader } from "./site-header";
import type { WatchlistNotification, WatchlistViewer } from "./types";

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
  href: z.string().regex(/^\/updates\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
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

export function PublicSiteHeader() {
  const [state, setState] = useState<HeaderPayload | null>(null);
  const [status, setStatus] = useState<HydrationStatus>("loading");

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
    <SiteHeader
      viewer={viewer}
      notifications={notifications}
      accountPending={status === "loading"}
      notificationsStatus={status}
      markNotificationReadAction={markUpdateReadAction}
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
  );
}
