import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { and, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type WatchlistDatabase } from "@/db";
import {
  analyticsEvents,
  catalogCompanyRefs,
  catalogProductRefs,
  publishedUpdates,
} from "@/db/schema";

export const ANALYTICS_VISITOR_COOKIE = "aisre_visitor";
export const ANALYTICS_VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
export const ANALYTICS_RATE_LIMIT_REQUESTS = 60;
export const ANALYTICS_RATE_LIMIT_WINDOW_SECONDS = 60;

const ANALYTICS_VISITOR_COOKIE_VERSION = "v1";

const publicSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const profileViewSchema = z
  .object({
    event: z.literal("profile_view"),
    subjectKind: z.enum(["product", "company"]),
    subjectSlug: publicSlugSchema,
  })
  .strict();

const outboundClickSchema = z
  .object({
    event: z.literal("outbound_click"),
    subjectKind: z.enum(["product", "company", "update"]),
    subjectSlug: publicSlugSchema,
  })
  .strict();

const updateViewSchema = z
  .object({
    event: z.literal("update_view"),
    subjectKind: z.literal("update"),
    subjectSlug: publicSlugSchema,
  })
  .strict();

const productShareSchema = z
  .object({
    event: z.literal("share"),
    subjectKind: z.literal("product"),
    subjectSlug: publicSlugSchema,
  })
  .strict();

export const analyticsEventInputSchema = z.discriminatedUnion("event", [
  profileViewSchema,
  outboundClickSchema,
  updateViewSchema,
  productShareSchema,
]);

export type AnalyticsEventInput = z.infer<typeof analyticsEventInputSchema>;

export const analyticsVisitorIdSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

const analyticsVisitorCookieSchema = z
  .string()
  .regex(/^v1\.[A-Za-z0-9_-]{32,128}\.[A-Za-z0-9_-]{43}$/);

const analyticsEnvironmentSchema = z.object({
  ANALYTICS_HASH_SECRET: z.string().min(32),
});

function readAnalyticsHashSecret(): string {
  return analyticsEnvironmentSchema.parse({
    ANALYTICS_HASH_SECRET: process.env.ANALYTICS_HASH_SECRET,
  }).ANALYTICS_HASH_SECRET;
}

export function createOpaqueVisitorId(): string {
  return randomBytes(32).toString("base64url");
}

function analyticsCookieSignature(visitorId: string, secret: string): string {
  return createHmac("sha256", z.string().min(32).parse(secret))
    .update(`ai-sre-watchlist-analytics-cookie-v1\0${visitorId}`)
    .digest("base64url");
}

/**
 * Signs the opaque visitor ID so arbitrary client-provided cookie values cannot
 * manufacture daily pseudonyms. The ID remains random and contains no user
 * identity.
 */
export function createAnalyticsVisitorCookie(
  visitorId: string,
  secret = readAnalyticsHashSecret(),
): string {
  const parsedVisitorId = analyticsVisitorIdSchema.parse(visitorId);
  const signature = analyticsCookieSignature(parsedVisitorId, secret);
  return `${ANALYTICS_VISITOR_COOKIE_VERSION}.${parsedVisitorId}.${signature}`;
}

export function parseAnalyticsVisitorCookie(
  cookie: string | undefined,
  secret = readAnalyticsHashSecret(),
): string | null {
  const parsedCookie = analyticsVisitorCookieSchema.safeParse(cookie);
  if (!parsedCookie.success) return null;

  const [, visitorId, suppliedSignature] = parsedCookie.data.split(".");
  if (!visitorId || !suppliedSignature) return null;

  const expectedSignature = analyticsCookieSignature(visitorId, secret);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);

  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  return analyticsVisitorIdSchema.parse(visitorId);
}

export function utcDay(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A valid date is required");
  }

  return date.toISOString().slice(0, 10);
}

export function createDailyVisitorHash(
  visitorId: string,
  day: string,
  secret: string,
): string {
  const parsedVisitorId = analyticsVisitorIdSchema.parse(visitorId);
  const parsedDay = z.iso.date().parse(day);
  const parsedSecret = z.string().min(32).parse(secret);

  return createHmac("sha256", parsedSecret)
    .update(`ai-sre-watchlist-analytics-v1\0${parsedDay}\0${parsedVisitorId}`)
    .digest("hex");
}

export function createDailyNetworkHash(
  networkSource: string,
  day: string,
  secret: string,
): string {
  const parsedSource = z.string().min(1).max(256).parse(networkSource);
  const parsedDay = z.iso.date().parse(day);
  const parsedSecret = z.string().min(32).parse(secret);

  return createHmac("sha256", parsedSecret)
    .update(
      `ai-sre-watchlist-analytics-network-day-v1\0${parsedDay}\0${parsedSource}`,
    )
    .digest("hex");
}

/**
 * Missing or rejected cookies receive the same opaque ID for a network source
 * during one UTC day. Ignoring Set-Cookie therefore cannot mint a new daily
 * analytics actor on every request. The HMAC input rotates daily and the raw
 * network address is never stored or exposed.
 */
export function createNetworkBoundVisitorId(
  networkSource: string,
  day: string,
  secret = readAnalyticsHashSecret(),
): string {
  const parsedSource = z.string().min(1).max(256).parse(networkSource);
  const parsedDay = z.iso.date().parse(day);
  const parsedSecret = z.string().min(32).parse(secret);

  return createHmac("sha256", parsedSecret)
    .update(
      `ai-sre-watchlist-analytics-network-visitor-v1\0${parsedDay}\0${parsedSource}`,
    )
    .digest("base64url");
}

export function analyticsRateLimitWindow(now = new Date()) {
  if (Number.isNaN(now.getTime())) {
    throw new TypeError("A valid date is required");
  }

  const windowMilliseconds = ANALYTICS_RATE_LIMIT_WINDOW_SECONDS * 1_000;
  const startedAt = new Date(
    Math.floor(now.getTime() / windowMilliseconds) * windowMilliseconds,
  );
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (startedAt.getTime() + windowMilliseconds - now.getTime()) / 1_000,
    ),
  );

  return { startedAt, retryAfterSeconds };
}

export function createAnalyticsRateLimitHash(
  networkSource: string,
  windowStartedAt: Date,
  secret: string,
): string {
  const parsedSource = z.string().min(1).max(256).parse(networkSource);
  const parsedSecret = z.string().min(32).parse(secret);

  // Including the fixed window prevents the stored hash from becoming a
  // durable cross-window network identifier. Raw network addresses never
  // enter Postgres.
  return createHmac("sha256", parsedSecret)
    .update(
      `ai-sre-watchlist-analytics-rate-v1\0${windowStartedAt.toISOString()}\0${parsedSource}`,
    )
    .digest("hex");
}

type ConsumeAnalyticsIngestionBudgetOptions = {
  database?: WatchlistDatabase;
  now?: Date;
  secret?: string;
};

export async function consumeAnalyticsIngestionBudget(
  networkSource: string,
  options: ConsumeAnalyticsIngestionBudgetOptions = {},
) {
  const database = options.database ?? getDatabase();
  const now = options.now ?? new Date();
  const { startedAt, retryAfterSeconds } = analyticsRateLimitWindow(now);
  const sourceHash = createAnalyticsRateLimitHash(
    networkSource,
    startedAt,
    options.secret ?? readAnalyticsHashSecret(),
  );

  // This fixed-window counter is intentionally stored in Postgres rather than
  // process memory so it is shared by concurrent and cold serverless workers.
  // Old, unlinkable window hashes are removed opportunistically.
  const consumed = await database.execute(sql`
    with expired as (
      delete from private.analytics_ingestion_limits
      where window_started_at < ${startedAt.toISOString()}::timestamptz - interval '1 day'
    ), budget as (
      insert into private.analytics_ingestion_limits (
        window_started_at,
        source_hash,
        request_count
      ) values (
        ${startedAt.toISOString()}::timestamptz,
        ${sourceHash},
        1
      )
      on conflict (window_started_at, source_hash) do update
        set request_count = private.analytics_ingestion_limits.request_count + 1
        where private.analytics_ingestion_limits.request_count < ${ANALYTICS_RATE_LIMIT_REQUESTS}
      returning request_count
    )
    select request_count from budget
  `);

  return {
    allowed: Array.from(consumed).length === 1,
    limit: ANALYTICS_RATE_LIMIT_REQUESTS,
    retryAfterSeconds,
  };
}

async function subjectIsPublic(
  database: WatchlistDatabase,
  event: AnalyticsEventInput,
  now: Date,
): Promise<boolean> {
  if (event.subjectKind === "product") {
    const result = await database
      .select({ slug: catalogProductRefs.slug })
      .from(catalogProductRefs)
      .where(
        and(
          eq(catalogProductRefs.slug, event.subjectSlug),
          eq(catalogProductRefs.isActive, true),
        ),
      )
      .limit(1);
    return result.length === 1;
  }

  if (event.subjectKind === "company") {
    const result = await database
      .select({ slug: catalogCompanyRefs.slug })
      .from(catalogCompanyRefs)
      .where(
        and(
          eq(catalogCompanyRefs.slug, event.subjectSlug),
          eq(catalogCompanyRefs.isActive, true),
        ),
      )
      .limit(1);
    return result.length === 1;
  }

  const result = await database
    .select({ slug: publishedUpdates.slug })
    .from(publishedUpdates)
    .where(
      and(
        eq(publishedUpdates.slug, event.subjectSlug),
        lte(publishedUpdates.publishedAt, now),
      ),
    )
    .limit(1);
  return result.length === 1;
}

type RecordAnalyticsEventOptions = {
  database?: WatchlistDatabase;
  now?: Date;
  secret?: string;
};

/**
 * Records an allowlisted public event. `false` means the public catalog subject
 * did not exist, so no analytics row was written.
 */
export async function recordAnalyticsEvent(
  rawEvent: unknown,
  visitorId: string,
  networkSource: string,
  options: RecordAnalyticsEventOptions = {},
): Promise<boolean> {
  const event = analyticsEventInputSchema.parse(rawEvent);
  const parsedVisitorId = analyticsVisitorIdSchema.parse(visitorId);
  const now = options.now ?? new Date();
  const day = utcDay(now);
  const database = options.database ?? getDatabase();

  if (!(await subjectIsPublic(database, event, now))) {
    return false;
  }

  const secret = options.secret ?? readAnalyticsHashSecret();
  const visitorDayHash = createDailyVisitorHash(
    parsedVisitorId,
    day,
    secret,
  );
  const networkDayHash = createDailyNetworkHash(networkSource, day, secret);

  await database.insert(analyticsEvents).values({
    occurredOn: day,
    occurredAt: now,
    visitorDayHash,
    networkDayHash,
    eventType: event.event,
    subjectKind: event.subjectKind,
    subjectSlug: event.subjectSlug,
  }).onConflictDoNothing({
    target: [
      analyticsEvents.occurredOn,
      analyticsEvents.visitorDayHash,
      analyticsEvents.eventType,
      analyticsEvents.subjectKind,
      analyticsEvents.subjectSlug,
    ],
  });

  return true;
}
