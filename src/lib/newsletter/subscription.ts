import type { NewsletterFrequency, NewsletterSubscriptionStatus } from "@/db";

/**
 * Existing active consent at the same cadence is already sufficient. A welcome
 * email is only useful for fresh consent, reactivation, or a cadence change.
 */
export function shouldSendWelcomeEmail(existing: {
  status: NewsletterSubscriptionStatus;
  frequency: NewsletterFrequency;
} | null, frequency: NewsletterFrequency) {
  return !existing || existing.status !== "active" || existing.frequency !== frequency;
}
