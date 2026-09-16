import type { NewsletterFrequency } from "@/db";

export type NewsletterDigestPeriod = {
  start: string;
  end: string;
  label: string;
};

export type NewsletterDigestUpdate = {
  id: string;
  title: string;
  summary: string;
  contentPath: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function utcWeekStart(date: Date) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const weekday = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return start;
}

/** Returns the last fully completed UTC calendar period, never a partial one. */
export function digestPeriod(
  frequency: NewsletterFrequency,
  now = new Date(),
): NewsletterDigestPeriod {
  const end = frequency === "weekly" ? utcWeekStart(now) : utcMonthStart(now);
  const start = new Date(end);
  if (frequency === "weekly") start.setUTCDate(start.getUTCDate() - 7);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}–${new Date(end.valueOf() - 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`,
  };
}

function plainText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function renderDigestText(options: {
  frequency: NewsletterFrequency;
  period: NewsletterDigestPeriod;
  updates: readonly NewsletterDigestUpdate[];
  siteUrl: string;
  unsubscribeUrl: string;
}) {
  const updates = options.updates.map((update) => {
    const url = new URL(update.contentPath, options.siteUrl).toString();
    return `• ${plainText(update.title, 300)}\n${plainText(update.summary, 800)}\n${url}`;
  });
  return [
    `AI SRE Watchlist ${options.frequency} digest · ${options.period.label}`,
    "",
    "These are editorially reviewed updates already published on AI SRE Watchlist.",
    "",
    ...updates,
    "",
    `Unsubscribe: ${options.unsubscribeUrl}`,
  ].join("\n");
}
