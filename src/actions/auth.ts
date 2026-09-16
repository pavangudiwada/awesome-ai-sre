"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { internalReturnPathSchema } from "@/lib/auth/schemas";
import { consumeMagicLinkBudget } from "@/lib/auth/rate-limit";
import { getAuth, isAuthConfigured, isMagicLinkConfigured } from "@/lib/auth/server";

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const providerSchema = z.enum(["google", "github"]);

function signInErrorUrl(message: string, next: string) {
  const query = new URLSearchParams({ error: message, next });
  return `/sign-in?${query.toString()}`;
}

function parseReturnTo(formData: FormData) {
  const result = internalReturnPathSchema.safeParse(formData.get("next"));
  return result.success ? result.data : "/workspace/saved";
}

function completionUrl(returnTo: string) {
  return `/auth/complete?next=${encodeURIComponent(returnTo)}`;
}

export async function signInWithOAuth(
  providerInput: "google" | "github",
  formData: FormData,
) {
  const provider = providerSchema.parse(providerInput);
  const returnTo = parseReturnTo(formData);
  if (!isAuthConfigured()) redirect(signInErrorUrl("Sign-in is not configured in this environment.", returnTo));

  const result = await getAuth().api.signInSocial({
    body: { provider, callbackURL: completionUrl(returnTo), errorCallbackURL: "/sign-in" },
    headers: await headers(),
  });

  if (!result.url) {
    redirect(signInErrorUrl("Unable to start provider sign-in.", returnTo));
  }

  redirect(result.url);
}

export async function sendMagicLink(formData: FormData) {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  const returnTo = parseReturnTo(formData);

  if (!emailResult.success) {
    redirect(signInErrorUrl("Enter a valid email address.", returnTo));
  }
  if (!isAuthConfigured() || !isMagicLinkConfigured()) redirect(signInErrorUrl("Email sign-in is not configured in this environment.", returnTo));
  try {
    const requestHeaders = await headers();
    const budget = await consumeMagicLinkBudget(emailResult.data, requestHeaders);
    if (!budget.allowed) {
      redirect(signInErrorUrl("Too many sign-in links requested. Please try again later.", returnTo));
    }
    await getAuth().api.signInMagicLink({
      body: { email: emailResult.data, callbackURL: completionUrl(returnTo), errorCallbackURL: "/sign-in" },
      headers: requestHeaders,
    });
  } catch {
    redirect(signInErrorUrl("Unable to send a sign-in link right now.", returnTo));
  }

  const query = new URLSearchParams({
    sent: "1",
    email: emailResult.data,
    next: returnTo,
  });
  redirect(`/sign-in?${query.toString()}`);
}

export async function signOut() {
  if (isAuthConfigured()) {
    await getAuth().api.signOut({ headers: await headers() });
  }
  redirect("/");
}
