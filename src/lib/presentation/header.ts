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
  getPublicHeaderUpdates,
  type PublicHeaderUpdate,
} from "./public-updates";

export interface HeaderState {
  viewer: WatchlistViewer | null;
  notifications: WatchlistNotification[];
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
  return updates.map((update) => ({
    id: update.id,
    title: update.title,
    summary: update.summary,
    href: `/updates/${update.slug}`,
    publishedAtLabel: formatUpdateDate(update.published_at),
    ...(includeReadState ? { unread: !readIds.has(update.id) } : {}),
    source:
      update.company_slug && followedSlugs.has(update.company_slug)
        ? "followed-company"
        : "watchlist",
    companyName: update.company_slug
      ? companyNames.get(update.company_slug)
      : undefined,
  }));
}

async function getAvailablePublicUpdates(): Promise<PublicHeaderUpdate[]> {
  try {
    return await getPublicHeaderUpdates();
  } catch {
    return [];
  }
}

function getCompanyNames(): ReadonlyMap<string, string> {
  try {
    return new Map(getCompanies().map((company) => [company.slug, company.name]));
  } catch {
    return new Map();
  }
}

export async function getHeaderState(): Promise<HeaderState> {
  const updatesPromise = getAvailablePublicUpdates();
  const practitionerId = await getAuthenticatedPractitionerId();

  const updates = await updatesPromise;
  if (!practitionerId) {
    return { viewer: null, notifications: presentNotifications(updates) };
  }

  const sql = getPostgresClient();
  const [userRows, profileRows, reads, follows] = await Promise.all([
    sql<{ email: string; name: string; image: string | null }[]>`select email, name, image from auth."user" where id = ${practitionerId}::uuid`,
    sql<{ display_name: string | null }[]>`select display_name from public.practitioner_profiles where user_id = ${practitionerId}::uuid`,
    sql<{ update_id: string }[]>`select update_id::text as update_id from public.update_reads where practitioner_id = ${practitionerId}::uuid`,
    sql<{ company_slug: string }[]>`select company_slug from public.company_follows where practitioner_id = ${practitionerId}::uuid`,
  ]);
  const user = userRows[0];
  const profile = profileRows[0];
  const displayName =
    profile?.display_name ?? user?.name ?? user?.email?.split("@")[0] ?? "Practitioner";
  const avatarUrl =
    user?.image ?? null;
  const readIds = new Set(reads.map((read) => read.update_id));
  const followedSlugs = new Set(follows.map((follow) => follow.company_slug));
  const companies = getCompanyNames();

  return {
    viewer: {
      displayName,
      email: user?.email,
      avatarUrl,
      workspaceHref: "/workspace/saved",
      settingsHref: "/settings",
      signOutAction: signOut,
    },
    notifications: presentNotifications(
      updates,
      readIds,
      followedSlugs,
      companies,
      true,
    ),
  };
}
