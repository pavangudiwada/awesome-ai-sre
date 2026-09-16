"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { consumeNewsletterSignupBudget } from "@/lib/newsletter/rate-limit";
import { newsletterStore } from "@/lib/newsletter/service";
import {
  newsletterSignupSchema,
  newsletterUnsubscribeTokenSchema,
} from "@/lib/newsletter/validation";
import { verifyUnsubscribeToken } from "@/lib/newsletter/tokens";

export type NewsletterActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const parsed = newsletterSignupSchema.safeParse({
    email: formData.get("email"),
    website: formData.get("website") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
    };
  }

  // Honeypot submissions receive the same neutral result without persistence.
  if (parsed.data.website) {
    return {
      status: "success",
      message: "Thanks — you’re on the list.",
    };
  }

  try {
    const budget = await consumeNewsletterSignupBudget(await headers());
    if (!budget.allowed) {
      return {
        status: "error",
        message: "Too many signup attempts from this network. Please try again later.",
      };
    }
    await newsletterStore().subscribe({
      ...parsed.data,
      frequency: "weekly",
      consent: "on",
    });
  } catch (error) {
    console.error("Newsletter subscription could not be saved", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      status: "error",
      message: "We could not subscribe you right now. Please try again.",
    };
  }
  return {
    status: "success",
    message: "Thanks — you’re on the list.",
  };
}

export async function unsubscribeNewsletterAction(formData: FormData) {
  const token = newsletterUnsubscribeTokenSchema.safeParse(formData.get("token"));
  const subscriptionId = token.success && process.env.NEWSLETTER_UNSUBSCRIBE_SECRET
    ? verifyUnsubscribeToken(token.data, process.env.NEWSLETTER_UNSUBSCRIBE_SECRET)
    : null;
  if (subscriptionId) await newsletterStore().unsubscribe(subscriptionId);
  // This neutral confirmation prevents a token from revealing subscription state.
  redirect("/newsletter/unsubscribe?status=done");
}
