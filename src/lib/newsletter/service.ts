import "server-only";

import { Resend } from "resend";
import { z } from "zod";

import { getPostgresClient } from "@/db";
import type { NewsletterSubscriptionInput } from "./validation";
import { shouldSendWelcomeEmail } from "./subscription";
import { createUnsubscribeToken } from "./tokens";

const newsletterEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  RESEND_API_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  RESEND_SENDER_EMAIL: z.preprocess((value) => value || undefined, z.string().email().optional()),
  NEWSLETTER_UNSUBSCRIBE_SECRET: z.preprocess((value) => value || undefined, z.string().min(32).optional()),
});

const CONSENT_TEXT =
  "Requested an AI SRE Watchlist email subscription through the public signup form.";

function getNewsletterEnvironment() {
  return newsletterEnvironmentSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL,
    NEWSLETTER_UNSUBSCRIBE_SECRET: process.env.NEWSLETTER_UNSUBSCRIBE_SECRET,
  });
}

function unsubscribeUrl(token: string, siteUrl: string) {
  const url = new URL("/newsletter/unsubscribe", siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Stores consent before attempting optional email. Delivery is intentionally
 * best-effort: a missing or temporary email provider never loses consent.
 */
async function sendWelcomeEmail(options: {
  email: string;
  subscriptionId: string;
}) {
  const environment = getNewsletterEnvironment();
  if (
    !environment.RESEND_API_KEY ||
    !environment.RESEND_SENDER_EMAIL ||
    !environment.NEXT_PUBLIC_SITE_URL ||
    !environment.NEWSLETTER_UNSUBSCRIBE_SECRET
  )
    return;

  const result = await new Resend(environment.RESEND_API_KEY).emails.send({
    from: environment.RESEND_SENDER_EMAIL,
    to: options.email,
    subject: "You’re subscribed to AI SRE Watchlist",
    text: `You’re subscribed to AI SRE Watchlist updates. Unsubscribe at any time: ${unsubscribeUrl(createUnsubscribeToken(options.subscriptionId, environment.NEWSLETTER_UNSUBSCRIBE_SECRET), environment.NEXT_PUBLIC_SITE_URL)}`,
  });
  if (result.error) throw new Error("Newsletter email delivery failed");
}

export function newsletterStore() {
  const sql = getPostgresClient();
  return {
    async subscribe(input: NewsletterSubscriptionInput) {
      const subscription = await sql.begin(async (transaction) => {
        // Serializes same-email submits without retaining IP addresses or
        // exposing account state. It also prevents concurrent welcome sends.
        await transaction`select pg_advisory_xact_lock(hashtextextended('newsletter:' || ${input.email}, 0))`;
        const [existing] = await transaction<{
          id: string;
          status: "active" | "unsubscribed";
          frequency: "weekly" | "monthly";
        }[]>`
          select id::text as id, status, frequency
          from private.newsletter_subscriptions
          where email = ${input.email}
          for update
        `;
        const shouldSend = shouldSendWelcomeEmail(existing ?? null, input.frequency);
        if (existing && !shouldSend) {
          return { id: existing.id, shouldSend: false };
        }
        if (existing) {
          await transaction`
            update private.newsletter_subscriptions
            set frequency = ${input.frequency}, status = 'active',
                consent_text = ${CONSENT_TEXT}, consented_at = now(),
                unsubscribed_at = null, updated_at = now()
            where id = ${existing.id}::uuid
          `;
          return { id: existing.id, shouldSend: true };
        }
        const [created] = await transaction<{ id: string }[]>`
          insert into private.newsletter_subscriptions
            (email, frequency, status, consent_text, consented_at, unsubscribed_at)
          values (${input.email}, ${input.frequency}, 'active', ${CONSENT_TEXT}, now(), null)
          returning id::text as id
        `;
        if (!created) throw new Error("Newsletter subscription did not return an id");
        return { id: created.id, shouldSend: true };
      });
      if (!subscription) throw new Error("Newsletter subscription did not return an id");

      if (!subscription.shouldSend) return;
      try {
        await sendWelcomeEmail({
          email: input.email,
          subscriptionId: subscription.id,
        });
      } catch (error) {
        // Do not expose provider details or addresses to the public form.
        console.error("Newsletter welcome email could not be sent", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },

    async unsubscribe(subscriptionId: string) {
      await sql`
        update private.newsletter_subscriptions
        set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
        where id = ${subscriptionId}::uuid and status = 'active'
      `;
    },
  };
}
