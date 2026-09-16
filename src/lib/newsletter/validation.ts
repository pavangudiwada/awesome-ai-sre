import { z } from "zod";

export const newsletterFrequencySchema = z.enum(["weekly", "monthly"]);

export const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  frequency: newsletterFrequencySchema,
  consent: z.literal("on"),
  website: z.string().max(200).optional(),
});

export const newsletterUnsubscribeTokenSchema = z.string().max(200);

export type NewsletterSubscriptionInput = z.infer<
  typeof newsletterSubscriptionSchema
>;
