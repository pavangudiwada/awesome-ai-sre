import { z } from "zod";

export const newsletterFrequencySchema = z.enum(["weekly", "monthly"]);

export const newsletterSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  website: z.string().max(200).optional(),
});

export const newsletterSubscriptionSchema = newsletterSignupSchema.extend({
  frequency: newsletterFrequencySchema,
  consent: z.literal("on"),
});

export const newsletterUnsubscribeTokenSchema = z.string().max(200);

export type NewsletterSubscriptionInput = z.infer<
  typeof newsletterSubscriptionSchema
>;
