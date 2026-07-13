import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { and, eq, lte } from "drizzle-orm";
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

  const visitorDayHash = createDailyVisitorHash(
    parsedVisitorId,
    day,
    options.secret ?? readAnalyticsHashSecret(),
  );

  await database.insert(analyticsEvents).values({
    occurredOn: day,
    occurredAt: now,
    visitorDayHash,
    eventType: event.event,
    subjectKind: event.subjectKind,
    subjectSlug: event.subjectSlug,
  });

  return true;
}
