import { z } from "zod";

const internalReturnPathPattern = /^\/(?!\/)[^\u0000-\u001f\u007f\\]*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const internalReturnPathSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(internalReturnPathPattern, "Use an internal application path");

export const catalogSlugSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(slugPattern, "Use a lowercase kebab-case catalog slug");

export const authProviderSchema = z.enum(["google", "github"]);

export const magicLinkRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    returnTo: internalReturnPathSchema.default("/workspace/saved"),
  })
  .strict();

export const oauthRequestSchema = z
  .object({
    provider: authProviderSchema,
    returnTo: internalReturnPathSchema.default("/workspace/saved"),
  })
  .strict();

const pendingAuthIntentBaseSchema = z.object({
  version: z.literal(1),
  slug: catalogSlugSchema,
  returnTo: internalReturnPathSchema,
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
});

export const pendingAuthIntentInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      slug: catalogSlugSchema,
      returnTo: internalReturnPathSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("follow"),
      slug: catalogSlugSchema,
      returnTo: internalReturnPathSchema,
    })
    .strict(),
]);

export const pendingAuthIntentPayloadSchema = z.discriminatedUnion("action", [
  pendingAuthIntentBaseSchema.extend({ action: z.literal("save") }).strict(),
  pendingAuthIntentBaseSchema.extend({ action: z.literal("follow") }).strict(),
]);

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type OAuthRequest = z.infer<typeof oauthRequestSchema>;
export type PendingAuthIntentInput = z.infer<
  typeof pendingAuthIntentInputSchema
>;
export type PendingAuthIntentPayload = z.infer<
  typeof pendingAuthIntentPayloadSchema
>;
