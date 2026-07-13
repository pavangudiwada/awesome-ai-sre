import type { Metadata } from "next";

import { sendMagicLink, signInWithOAuth } from "@/actions/auth";
import { AuthPanel } from "@/components/watchlist";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save products, keep private notes, build evaluations, and follow company updates.",
  alternates: { canonical: "/sign-in" },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    email?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const next = params.next?.startsWith("/") ? params.next : "/workspace/saved";
  const error = params.error
    ? params.error
    : configured
      ? undefined
      : "Authentication is not configured for this local preview. Public research remains available.";

  return (
    <AuthPanel
      magicLinkAction={sendMagicLink}
      googleAction={configured ? signInWithOAuth.bind(null, "google") : undefined}
      githubAction={configured ? signInWithOAuth.bind(null, "github") : undefined}
      nextPath={next}
      emailDefaultValue={params.email}
      errorMessage={error}
      successMessage={
        params.sent === "1" && params.email
          ? `A one-time sign-in link was sent to ${params.email}.`
          : undefined
      }
    />
  );
}
