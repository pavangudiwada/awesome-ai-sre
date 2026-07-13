"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { internalReturnPathSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const providerSchema = z.enum(["google", "github"]);

function signInErrorUrl(message: string, next: string) {
  const query = new URLSearchParams({ error: message, next });
  return `/sign-in?${query.toString()}`;
}

async function requestOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured).origin;
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? "http://localhost:3000";
}

function parseReturnTo(formData: FormData) {
  const result = internalReturnPathSchema.safeParse(formData.get("next"));
  return result.success ? result.data : "/workspace/saved";
}

export async function signInWithOAuth(
  providerInput: "google" | "github",
  formData: FormData,
) {
  const provider = providerSchema.parse(providerInput);
  const returnTo = parseReturnTo(formData);
  const origin = await requestOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", returnTo);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect(signInErrorUrl("Unable to start provider sign-in.", returnTo));
  }

  redirect(data.url);
}

export async function sendMagicLink(formData: FormData) {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  const returnTo = parseReturnTo(formData);

  if (!emailResult.success) {
    redirect(signInErrorUrl("Enter a valid email address.", returnTo));
  }

  const origin = await requestOrigin();
  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", returnTo);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailResult.data,
    options: {
      emailRedirectTo: confirmUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
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
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
