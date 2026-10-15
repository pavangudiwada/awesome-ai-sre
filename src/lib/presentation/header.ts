import "server-only";

import type {
  WatchlistNotification,
  WatchlistViewer,
} from "@/components/watchlist/types";
import { signOut } from "@/actions/auth";
import { getPostgresClient } from "@/db";
import { getAuthenticatedPractitionerId } from "@/lib/auth/actions";
import { getCompanies } from "@/lib/catalog";

import {
  getPublicHeaderFeed,
  type PublicHeaderUpdate,
  type PublicHeaderFeed,
} from "./public-updates";
import { isPersistedUpdateId } from "./notification-id";

export interface HeaderState {
  viewer: WatchlistViewer | null;
  notifications: WatchlistNotification[];
  publicationStatus: PublicHeaderFeed["publicationStatus"];
  personalizationUnavailable?: boolean;
}

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function presentNotifications(
  updates: readonly PublicHeaderUpdate[],
  readIds: ReadonlySet<string> = new Set(),
  followedSlugs: ReadonlySet<string> = new Set(),
  companyNames: ReadonlyMap<string, string> = new Map(),
  includeReadState = false,
): WatchlistNotification[] {
  return updates.map((update) => {
    const companySlug = update.company_slug ?? [...companyNames].find(([, name]) =>
      name.toLowerCase() === update.company_name?.toLowerCase(),
    )?.[0];
    return {
      id: update.id,
      title: update.title,
      summary: update.summary,
      href: update.href,
      publishedAtLabel: `${update.date_basis === "announced" ? "Announced" : "Published"} ${formatUpdateDate(update.date)}`,
      actualEventDateLabel: update.event_date ? formatUpdateDate(update.event_date) : "Unknown",
      category: update.category,
      ...(includeReadState && isPersistedUpdateId(update.id) ? { unread: !readIds.has(update.id) } : {}),
      source: companySlug && followedSlugs.has(companySlug) ? "followed-company" : "watchlist",
      companyName: companySlug ? companyNames.get(companySlug) ?? update.company_name ?? undefined : update.company_name ?? undefined,
    };
  });
}

function getCompanyNames(): ReadonlyMap<string, string> {
  try {
    return new Map(getCompanies().map((company) => [company.slug, company.name]));
  } catch {
    return new Map();
  }
}

export async function getHeaderState(): Promise<HeaderState> {
  const feed = await getPublicHeaderFeed();
  const publicState: HeaderState = {
    viewer: null,
    notifications: presentNotifications(feed.updates),
    publicationStatus: feed.publicationStatus,
  };
  // A private personalization failure must not remove public ecosystem news.
  // No private/read state is guessed when session or ownership-scoped reads fail.
  try {
    const practitionerId = await getAuthenticatedPractitionerId();
    if (!practitionerId) return publicState;

    const sql = getPostgresClient();
    const [userRows, profileRows, reads, follows] = await Promise.all([
      sql<{ email: string; name: string; image: string | null }[]>`select email, name, image from auth."user" where id = ${practitionerId}::uuid`,
      sql<{ display_name: string | null }[]>`select display_name from public.practitioner_profiles where user_id = ${practitionerId}::uuid`,
      sql<{ update_id: string }[]>`select update_id::text as update_id from public.update_reads where practitioner_id = ${practitionerId}::uuid`,
      sql<{ company_slug: string }[]>`select company_slug from public.company_follows where practitioner_id = ${practitionerId}::uuid`,
    ]);
    const user = userRows[0];
    const profile = profileRows[0];
    const displayName = profile?.display_name ?? user?.name ?? user?.email?.split("@")[0] ?? "Practitioner";
    const readIds = new Set(reads.map((read) => read.update_id));
    const followedSlugs = new Set(follows.map((follow) => follow.company_slug));
    return {
      viewer: {
        displayName,
        email: user?.email,
        avatarUrl: user?.image ?? null,
        workspaceHref: "/workspace/saved",
        settingsHref: "/settings",
        signOutAction: signOut,
      },
      publicationStatus: feed.publicationStatus,
      notifications: presentNotifications(feed.updates, readIds, followedSlugs, getCompanyNames(), true),
    };
  } catch {
    return { ...publicState, personalizationUnavailable: true };
  }
}
