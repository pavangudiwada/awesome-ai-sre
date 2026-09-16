import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const subscriptionIdSchema = z.string().uuid();
const secretSchema = z.string().min(32);
const tokenSchema = z.string().regex(
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/i,
);

function signature(subscriptionId: string, secret: string) {
  return createHmac("sha256", secretSchema.parse(secret))
    .update(subscriptionIdSchema.parse(subscriptionId))
    .digest("base64url");
}

export function createUnsubscribeToken(subscriptionId: string, secret: string) {
  const id = subscriptionIdSchema.parse(subscriptionId);
  return `${id}.${signature(id, secret)}`;
}

export function verifyUnsubscribeToken(token: string, secret: string) {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return null;
  const [subscriptionId, receivedSignature] = parsed.data.split(".");
  const expectedSignature = signature(subscriptionId, secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return null;
  return subscriptionId;
}
