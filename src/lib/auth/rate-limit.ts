import "server-only";

import { createHmac } from "node:crypto";

import { z } from "zod";

import { getPostgresClient } from "@/db";
import { trustedClientIp } from "@/lib/http/client-ip";

const EMAIL_LIMIT_PER_HOUR = 5;
const NETWORK_LIMIT_PER_HOUR = 10;
const emailSchema = z.string().trim().toLowerCase().email().max(320);
const secretSchema = z.string().min(32);

type SqlClient = ReturnType<typeof getPostgresClient>;

export function magicLinkRateLimitWindow(now = new Date()) {
  const startedAt = new Date(now);
  startedAt.setUTCMinutes(0, 0, 0);
  return { startedAt, retryAfterSeconds: 60 * 60 - now.getUTCMinutes() * 60 - now.getUTCSeconds() };
}

export function createMagicLinkRateLimitHash(value: string, secret: string) {
  return createHmac("sha256", secretSchema.parse(secret))
    .update(`ai-sre-watchlist-magic-link-rate-v1\0${value}`)
    .digest("hex");
}

export function parseMagicLinkEmail(value: unknown) {
  return emailSchema.safeParse(value);
}

export async function consumeMagicLinkBudget(
  emailInput: string,
  requestHeaders: Headers,
  options: { now?: Date; secret?: string; sql?: SqlClient } = {},
) {
  const email = emailSchema.parse(emailInput);
  const { startedAt, retryAfterSeconds } = magicLinkRateLimitWindow(options.now);
  const secret = options.secret ?? process.env.BETTER_AUTH_SECRET;
  const networkHash = createMagicLinkRateLimitHash(
    trustedClientIp(requestHeaders),
    secret ?? "",
  );
  const emailHash = createMagicLinkRateLimitHash(email, secret ?? "");
  const sql = options.sql ?? getPostgresClient();

  const allowed = await sql.begin(async (transaction) => {
    // Serializing each shared network bucket makes its unknown-network fallback
    // durable across workers without retaining the source address in Postgres.
    await transaction`
      delete from private.auth_magic_link_rate_limits
      where window_started_at < ${startedAt.toISOString()}::timestamptz - interval '24 hours'
    `;
    await transaction`select pg_advisory_xact_lock(hashtextextended('magic-link:' || ${networkHash}, 0))`;
    const consume = async (kind: "network" | "email", hash: string, limit: number) => {
      const [row] = await transaction<{ accepted: boolean }[]>`
        insert into private.auth_magic_link_rate_limits
          (window_started_at, key_kind, key_hash, request_count)
        values (${startedAt.toISOString()}::timestamptz, ${kind}, ${hash}, 1)
        on conflict (window_started_at, key_kind, key_hash) do update
          set request_count = private.auth_magic_link_rate_limits.request_count + 1
          where private.auth_magic_link_rate_limits.request_count < ${limit}
        returning true as accepted
      `;
      return row?.accepted === true;
    };

    return (await consume("network", networkHash, NETWORK_LIMIT_PER_HOUR))
      && (await consume("email", emailHash, EMAIL_LIMIT_PER_HOUR));
  });

  return { allowed, retryAfterSeconds };
}
