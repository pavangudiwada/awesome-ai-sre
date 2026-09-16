#!/usr/bin/env tsx

/**
 * Delivery is deliberately an operator/VM job, not a GitHub Action: it needs
 * private Postgres and Resend credentials. It reads only public.published_updates.
 */
import postgres from "postgres";
import { Resend } from "resend";
import { z } from "zod";

import {
  digestPeriod,
  renderDigestText,
  type NewsletterDigestUpdate,
} from "../src/lib/newsletter/digest";
import { createUnsubscribeToken } from "../src/lib/newsletter/tokens";

const frequencySchema = z.enum(["weekly", "monthly"]);
const environmentSchema = z.object({
  DATABASE_URL: z.string().url().regex(/^postgres(?:ql)?:\/\//),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  RESEND_API_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  RESEND_SENDER_EMAIL: z.preprocess((value) => value || undefined, z.string().email().optional()),
  NEWSLETTER_UNSUBSCRIBE_SECRET: z.preprocess((value) => value || undefined, z.string().min(32).optional()),
});

type Subscriber = { id: string; email: string };
type Delivery = { id: string };

function readFlag(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function unsubscribeUrl(subscriptionId: string, siteUrl: string, secret: string) {
  const url = new URL("/newsletter/unsubscribe", siteUrl);
  url.searchParams.set("token", createUnsubscribeToken(subscriptionId, secret));
  return url.toString();
}

async function reserveDelivery(options: {
  sql: ReturnType<typeof postgres>;
  subscriber: Subscriber;
  frequency: "weekly" | "monthly";
  period: ReturnType<typeof digestPeriod>;
  updateIds: readonly string[];
}): Promise<Delivery | null> {
  const [delivery] = await options.sql<Delivery[]>`
    insert into private.newsletter_digest_deliveries
      (subscription_id, frequency, period_start, period_end, update_ids, status, attempt_count)
    values
      (${options.subscriber.id}::uuid, ${options.frequency}, ${options.period.start}::date, ${options.period.end}::date, ${JSON.stringify(options.updateIds)}::jsonb, 'pending', 1)
    on conflict (subscription_id, frequency, period_start) do update set
      status = 'pending',
      attempt_count = private.newsletter_digest_deliveries.attempt_count + 1,
      last_error = null,
      updated_at = now()
    where private.newsletter_digest_deliveries.attempt_count < 20
      and (
        private.newsletter_digest_deliveries.status = 'failed'
        or (
          private.newsletter_digest_deliveries.status = 'pending'
          and private.newsletter_digest_deliveries.updated_at < now() - interval '30 minutes'
        )
      )
    returning id::text as id
  `;
  return delivery ?? null;
}

async function markDelivered(sql: ReturnType<typeof postgres>, id: string, providerMessageId: string) {
  await sql`
    update private.newsletter_digest_deliveries
    set status = 'delivered', provider_message_id = ${providerMessageId}, last_error = null, updated_at = now()
    where id = ${id}::uuid and status = 'pending'
  `;
}

async function markFailed(sql: ReturnType<typeof postgres>, id: string) {
  await sql`
    update private.newsletter_digest_deliveries
    set status = 'failed', last_error = 'Resend did not accept the digest', updated_at = now()
    where id = ${id}::uuid and status = 'pending'
  `;
}

async function main() {
  const frequency = frequencySchema.parse(readFlag("--frequency"));
  const dryRun = process.argv.includes("--dry-run");
  const environment = environmentSchema.parse(process.env);
  if (!dryRun && (!environment.RESEND_API_KEY || !environment.RESEND_SENDER_EMAIL || !environment.NEWSLETTER_UNSUBSCRIBE_SECRET)) {
    throw new Error("RESEND_API_KEY, RESEND_SENDER_EMAIL, and NEWSLETTER_UNSUBSCRIBE_SECRET are required to send a digest");
  }

  const period = digestPeriod(frequency);
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  try {
    const updates = await sql<NewsletterDigestUpdate[]>`
      select id::text as id, title, summary, content_path as "contentPath"
      from public.published_updates
      where published_at >= ${period.start}::date and published_at < ${period.end}::date
      order by published_at asc, id asc
      limit 20
    `;
    if (!updates.length) {
      process.stdout.write(`No published updates for ${frequency} period ${period.start} to ${period.end}; nothing sent.\n`);
      return;
    }
    const subscribers = await sql<Subscriber[]>`
      select id::text as id, email
      from private.newsletter_subscriptions
      where status = 'active' and frequency = ${frequency}
      order by id asc
    `;
    if (dryRun) {
      process.stdout.write(`Dry run: ${updates.length} published update(s), ${subscribers.length} active ${frequency} subscriber(s), period ${period.start} to ${period.end}. No messages or delivery records created.\n`);
      return;
    }

    const resend = new Resend(environment.RESEND_API_KEY!);
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const subscriber of subscribers) {
      const delivery = await reserveDelivery({
        sql,
        subscriber,
        frequency,
        period,
        updateIds: updates.map((update) => update.id),
      });
      if (!delivery) {
        skipped += 1;
        continue;
      }
      const unsubscribe = unsubscribeUrl(
        subscriber.id,
        environment.NEXT_PUBLIC_SITE_URL,
        environment.NEWSLETTER_UNSUBSCRIBE_SECRET!,
      );
      const result = await resend.emails.send(
        {
          from: environment.RESEND_SENDER_EMAIL!,
          to: subscriber.email,
          subject: `AI SRE Watchlist ${frequency} digest · ${period.label}`,
          text: renderDigestText({
            frequency,
            period,
            updates,
            siteUrl: environment.NEXT_PUBLIC_SITE_URL,
            unsubscribeUrl: unsubscribe,
          }),
          headers: { "List-Unsubscribe": `<${unsubscribe}>` },
        },
        { idempotencyKey: `newsletter-digest-${delivery.id}` },
      );
      if (result.error || !result.data?.id) {
        await markFailed(sql, delivery.id);
        failed += 1;
        continue;
      }
      await markDelivered(sql, delivery.id, result.data.id);
      sent += 1;
    }
    process.stdout.write(`Digest ${frequency} ${period.start} to ${period.end}: sent=${sent}, skipped=${skipped}, failed=${failed}.\n`);
    if (failed) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
