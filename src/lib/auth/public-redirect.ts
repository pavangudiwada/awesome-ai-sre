import "server-only";

import { z } from "zod";

import { internalReturnPathSchema } from "./schemas";

const publicAuthOriginSchema = z.object({
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export function publicAuthRedirectUrl(
  path: string,
  environment: Record<string, string | undefined> = process.env,
): URL {
  const configured = publicAuthOriginSchema.parse(environment);
  const publicOrigin = new URL(configured.NEXT_PUBLIC_SITE_URL).origin;
  const authOrigin = new URL(configured.BETTER_AUTH_URL).origin;

  if (publicOrigin !== authOrigin) {
    throw new Error("BETTER_AUTH_URL must match NEXT_PUBLIC_SITE_URL");
  }

  return new URL(internalReturnPathSchema.parse(path), publicOrigin);
}
