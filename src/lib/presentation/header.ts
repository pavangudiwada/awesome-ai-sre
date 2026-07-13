import "server-only";

import type {
  WatchlistNotification,
  WatchlistViewer,
} from "@/components/watchlist/types";
import { signOut } from "@/actions/auth";
import { getCompanies } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

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

export async function getHeaderState(): Promise<HeaderState> {
  if (!isSupabaseConfigured()) return { viewer: null, notifications: [] };

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const practitionerId = claimsData?.claims?.sub;
    const { data: updatesData } = await supabase
      .from("published_updates")
      .select("id,slug,company_slug,title,summary,published_at")
      .order("published_at", { ascending: false })
      .limit(12);

    if (!practitionerId) {
      return {
        viewer: null,
        notifications: (updatesData ?? []).map((update) => ({
          id: update.id,
          title: update.title,
          summary: update.summary,
          href: `/updates/${update.slug}`,
          publishedAtLabel: formatUpdateDate(update.published_at),
          source: "watchlist",
        })),
      };
    }

    const [{ data: userData }, { data: profile }, { data: reads }, { data: follows }] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("practitioner_profiles")
          .select("display_name")
          .eq("user_id", practitionerId)
          .maybeSingle(),
        supabase.from("update_reads").select("update_id").eq("practitioner_id", practitionerId),
        supabase.from("company_follows").select("company_slug").eq("practitioner_id", practitionerId),
      ]);

    const user = userData.user;
    const metadataName =
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user?.user_metadata?.name === "string"
          ? user.user_metadata.name
          : undefined;
    const displayName = profile?.display_name ?? metadataName ?? user?.email?.split("@")[0] ?? "Practitioner";
    const avatarUrl =
      typeof user?.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;
    const readIds = new Set((reads ?? []).map((read) => read.update_id));
    const followedSlugs = new Set((follows ?? []).map((follow) => follow.company_slug));
    const companies = new Map(getCompanies().map((company) => [company.slug, company.name]));

    return {
      viewer: {
        displayName,
        email: user?.email,
        avatarUrl,
        workspaceHref: "/workspace/saved",
        settingsHref: "/settings",
        signOutAction: signOut,
      },
      notifications: (updatesData ?? []).map((update) => ({
        id: update.id,
        title: update.title,
        summary: update.summary,
        href: `/updates/${update.slug}`,
        publishedAtLabel: formatUpdateDate(update.published_at),
        unread: !readIds.has(update.id),
        source:
          update.company_slug && followedSlugs.has(update.company_slug)
            ? "followed-company"
            : "watchlist",
        companyName: update.company_slug
          ? companies.get(update.company_slug)
          : undefined,
      })),
    };
  } catch {
    return { viewer: null, notifications: [] };
  }
}
