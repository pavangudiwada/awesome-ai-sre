#!/usr/bin/env tsx

import { pathToFileURL } from "node:url";
const canonicalHost = "aisrewatchlist.com";
const secretNames = [
  "BETTER_AUTH_SECRET",
  "AUTH_INTENT_SECRET",
  "ANALYTICS_HASH_SECRET",
  "SUBMISSION_HASH_SECRET",
  "NEWSLETTER_RATE_LIMIT_SECRET",
] as const;

export function releaseEnvironmentIssues(
  env: Record<string, string | undefined>,
): string[] {
  const issues: string[] = [];
  const database = env.DATABASE_URL?.trim();
  if (!database || !/^postgres(?:ql)?:\/\//.test(database))
    issues.push("DATABASE_URL must be a PostgreSQL URL");
  for (const name of secretNames) {
    const value = env[name]?.trim();
    if (
      !value ||
      value.length < 32 ||
      value.startsWith("ci-") ||
      value.startsWith("release-")
    )
      issues.push(
        `${name} must be a non-placeholder secret of at least 32 characters`,
      );
  }
  for (const name of ["BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL"] as const) {
    try {
      const url = new URL(env[name] ?? "");
      if (url.protocol !== "https:" || url.hostname !== canonicalHost)
        throw new Error();
    } catch {
      issues.push(
        `${name} must use canonical production HTTPS host ${canonicalHost}`,
      );
    }
  }
  if (env.TRUST_PROXY !== "exe")
    issues.push("TRUST_PROXY must be exe behind the exe reverse proxy");
  const resendKey = env.RESEND_API_KEY?.trim(),
    resendSender = env.RESEND_SENDER_EMAIL?.trim();
  if (Boolean(resendKey) !== Boolean(resendSender))
    issues.push(
      "RESEND_API_KEY and RESEND_SENDER_EMAIL must be configured together or both omitted",
    );
  if (resendKey && resendSender) {
    for (const name of [
      "NEWSLETTER_UNSUBSCRIBE_SECRET",
    ] as const) {
      const value = env[name]?.trim();
      if (!value || value.length < 32)
        issues.push(`${name} must be at least 32 characters when Resend is enabled`);
    }
  }
  return issues;
}

function main() {
  const issues = releaseEnvironmentIssues(process.env);
  if (issues.length)
    throw new Error(`Unsafe production environment:\n- ${issues.join("\n- ")}`);
  process.stdout.write(
    "Verified plain PostgreSQL, Better Auth, canonical host, trusted proxy, and optional Resend/newsletter configuration without printing values.\n",
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
