import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  pendingAuthIntentInputSchema,
  pendingAuthIntentPayloadSchema,
  type PendingAuthIntentInput,
  type PendingAuthIntentPayload,
} from "./schemas";

export const PENDING_AUTH_INTENT_TTL_SECONDS = 10 * 60;
export const PENDING_AUTH_INTENT_COOKIE = "watchlist-auth-intent";

const intentEnvironmentSchema = z.object({
  AUTH_INTENT_SECRET: z.string().min(32),
});

const encodedTokenSchema = z
  .string()
  .min(32)
  .max(2_048)
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

function getIntentSecret(): string {
  return intentEnvironmentSchema.parse({
    AUTH_INTENT_SECRET: process.env.AUTH_INTENT_SECRET,
  }).AUTH_INTENT_SECRET;
}

function sign(encodedPayload: string): Buffer {
  return createHmac("sha256", getIntentSecret()).update(encodedPayload).digest();
}

export function createPendingAuthIntent(
  input: PendingAuthIntentInput,
  now = new Date(),
): string {
  const parsedInput = pendingAuthIntentInputSchema.parse(input);
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const payload: PendingAuthIntentPayload = {
    version: 1,
    ...parsedInput,
    issuedAt,
    expiresAt: issuedAt + PENDING_AUTH_INTENT_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = sign(encodedPayload).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyPendingAuthIntent(
  token: string,
  now = new Date(),
): PendingAuthIntentPayload | null {
  const parsedToken = encodedTokenSchema.safeParse(token);
  if (!parsedToken.success) return null;

  const [encodedPayload, encodedSignature] = parsedToken.data.split(".");
  const providedSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = sign(encodedPayload);

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  const parsedPayload = pendingAuthIntentPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) return null;

  const currentTime = Math.floor(now.getTime() / 1_000);
  const { issuedAt, expiresAt } = parsedPayload.data;

  if (
    expiresAt - issuedAt !== PENDING_AUTH_INTENT_TTL_SECONDS ||
    issuedAt > currentTime + 30 ||
    expiresAt <= currentTime
  ) {
    return null;
  }

  return parsedPayload.data;
}

export function pendingAuthIntentCookieOptions(
  secure = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    maxAge: PENDING_AUTH_INTENT_TTL_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}
export function clearPendingAuthIntentCookieOptions(
  secure = process.env.NODE_ENV === "production",
) {
  return {
    ...pendingAuthIntentCookieOptions(secure),
    maxAge: 0,
  };
}
