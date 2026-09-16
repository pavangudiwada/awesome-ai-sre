import type { Metadata } from "next";

import { sendMagicLink, signInWithOAuth } from "@/actions/auth";
import { AuthPanel } from "@/components/watchlist";
import { isAuthConfigured, isMagicLinkConfigured, isOAuthProviderConfigured } from "@/lib/auth/server";
import { internalReturnPathSchema } from "@/lib/auth/schemas";
import { PRIVATE_WORKFLOWS_AVAILABLE } from "@/lib/features";

// Provider availability and user-facing error/success state come from this request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PRIVATE_WORKFLOWS_AVAILABLE
    ? "Sign in or create a workspace"
    : "Private workspace coming soon",
  description: "Create a private place to save AI reliability products, add notes, and compare serious candidates.",
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
  const configured = isAuthConfigured();
  const magicLinkConfigured = isMagicLinkConfigured();
  const next = internalReturnPathSchema.safeParse(params.next).success
    ? params.next!
    : "/workspace/saved";
  const error = params.error
    ? params.error
    : configured
      ? undefined
      : "Authentication is not configured for this local preview. Public research remains available.";

  return (
    <AuthPanel
      magicLinkAction={magicLinkConfigured ? sendMagicLink : undefined}
      googleAction={configured && isOAuthProviderConfigured("google") ? signInWithOAuth.bind(null, "google") : undefined}
      githubAction={configured && isOAuthProviderConfigured("github") ? signInWithOAuth.bind(null, "github") : undefined}
      nextPath={next}
      emailDefaultValue={params.email}
      errorMessage={error}
      successMessage={
        params.sent === "1" && params.email
          ? `A one-time sign-in link was sent to ${params.email}.`
          : undefined
      }
      disabled={!PRIVATE_WORKFLOWS_AVAILABLE}
    />
  );
}
