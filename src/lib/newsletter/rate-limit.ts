import "server-only";

import { createHmac } from "node:crypto";

import { z } from "zod";

import { getPostgresClient } from "@/db";
import { trustedClientIp } from "@/lib/http/client-ip";

const NETWORK_LIMIT_PER_HOUR = 8;
const secretSchema = z.string().min(32);
type SqlClient = ReturnType<typeof getPostgresClient>;

export function newsletterRateLimitWindow(now = new Date()) {
  const startedAt = new Date(now);
  startedAt.setUTCMinutes(0, 0, 0);
  return {
    startedAt,
    retryAfterSeconds:
      60 * 60 - now.getUTCMinutes() * 60 - now.getUTCSeconds(),
  };
}

export function createNewsletterRateLimitHash(value: string, secret: string) {
  return createHmac("sha256", secretSchema.parse(secret))
    .update(`ai-sre-watchlist-newsletter-rate-v1\0${value}`)
    .digest("hex");
}

export async function consumeNewsletterSignupBudget(
  requestHeaders: Headers,
  options: { now?: Date; secret?: string; sql?: SqlClient } = {},
) {
  const { startedAt, retryAfterSeconds } = newsletterRateLimitWindow(options.now);
  const sourceHash = createNewsletterRateLimitHash(
    trustedClientIp(requestHeaders),
    options.secret ?? process.env.NEWSLETTER_RATE_LIMIT_SECRET ?? "",
  );
  const sql = options.sql ?? getPostgresClient();

  const allowed = await sql.begin(async (transaction) => {
    await transaction`
      delete from private.newsletter_signup_rate_limits
      where window_started_at < ${startedAt.toISOString()}::timestamptz - interval '24 hours'
    `;
    await transaction`select pg_advisory_xact_lock(hashtextextended('newsletter-rate:' || ${sourceHash}, 0))`;
    const [row] = await transaction<{ accepted: boolean }[]>`
      insert into private.newsletter_signup_rate_limits
        (window_started_at, source_hash, request_count)
      values (${startedAt.toISOString()}::timestamptz, ${sourceHash}, 1)
      on conflict (window_started_at, source_hash) do update
        set request_count = private.newsletter_signup_rate_limits.request_count + 1
        where private.newsletter_signup_rate_limits.request_count < ${NETWORK_LIMIT_PER_HOUR}
      returning true as accepted
    `;
    return row?.accepted === true;
  });

  return { allowed, retryAfterSeconds };
}
