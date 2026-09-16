import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

export const AUTH_E2E_USERS = {
  primary: { id: "10000000-0000-4000-8000-000000000101", email: "release-primary@watchlist.test" },
  secondary: { id: "10000000-0000-4000-8000-000000000102", email: "release-secondary@watchlist.test" },
} as const;

export type AuthenticatedFixtureUsers = typeof AUTH_E2E_USERS;

function localEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  const capturePath = process.env.AUTH_E2E_CAPTURE_PATH;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!databaseUrl || !capturePath || !siteUrl) {
    throw new Error("Authenticated E2E requires DATABASE_URL, AUTH_E2E_CAPTURE_PATH, and NEXT_PUBLIC_SITE_URL");
  }
  const databaseHost = new URL(databaseUrl).hostname;
  const siteHost = new URL(siteUrl).hostname;
  if (
    !["127.0.0.1", "localhost"].includes(databaseHost) ||
    !["127.0.0.1", "localhost"].includes(siteHost) ||
    new URL(databaseUrl).pathname !== "/ai_sre_test"
  ) {
    throw new Error("Authenticated E2E fixtures require loopback ai_sre_test PostgreSQL and site origins");
  }
  return { databaseUrl, capturePath, siteUrl };
}

function database() {
  return postgres(localEnvironment().databaseUrl, { max: 1, prepare: false });
}

export async function seedLocalAuthenticatedFixtures(): Promise<AuthenticatedFixtureUsers> {
  const sql = database();
  try {
    const fixtures = Object.values(AUTH_E2E_USERS);
    await sql`delete from auth."user" where id in ${sql(fixtures.map((fixture) => fixture.id))}`;
    for (const [name, fixture] of Object.entries(AUTH_E2E_USERS)) {
      await sql`
        insert into auth."user" (id, name, email, email_verified)
        values (${fixture.id}::uuid, ${`Release ${name}`}, ${fixture.email}, true)
      `;
    }
    await sql`
      insert into public.catalog_company_refs (slug, name, is_active)
      values ('runwhen', 'RunWhen', true), ('robusta', 'Robusta', true)
      on conflict (slug) do update set name = excluded.name, is_active = excluded.is_active
    `;
    await sql`
      insert into public.catalog_product_refs (slug, name, company_slug, is_active)
      values ('runwhen', 'RunWhen', 'runwhen', true), ('holmesgpt', 'HolmesGPT', 'robusta', true)
      on conflict (slug) do update set name = excluded.name, company_slug = excluded.company_slug, is_active = excluded.is_active
    `;
  } finally {
    await sql.end();
  }
  await clearCapturedMagicLinks();
  return AUTH_E2E_USERS;
}

export async function resetLocalUserWorkflows(users: AuthenticatedFixtureUsers) {
  const sql = database();
  try {
    const ids = Object.values(users).map((user) => user.id);
    const userIds = sql(ids);
    await sql`delete from public.product_notes where practitioner_id in ${userIds}`;
    await sql`delete from public.saved_products where practitioner_id in ${userIds}`;
    await sql`delete from public.company_follows where practitioner_id in ${userIds}`;
    await sql`delete from public.evaluations where practitioner_id in ${userIds}`;
    await sql`delete from auth.session where user_id in ${userIds}`;
    await sql`delete from private.auth_magic_link_rate_limits`;
  } finally {
    await sql.end();
  }
  await clearCapturedMagicLinks();
}

export async function cleanupLocalAuthenticatedFixtures(users: AuthenticatedFixtureUsers) {
  const sql = database();
  try {
    const userIds = sql(Object.values(users).map((user) => user.id));
    await sql`delete from auth."user" where id in ${userIds}`;
    await sql`delete from private.auth_magic_link_rate_limits`;
  } finally {
    await sql.end();
  }
  await clearCapturedMagicLinks();
}

export async function clearCapturedMagicLinks() {
  const capturePath = localEnvironment().capturePath;
  await mkdir(dirname(capturePath), { recursive: true, mode: 0o700 });
  await writeFile(capturePath, "", { mode: 0o600 });
}

async function capturedMagicLink(email: string): Promise<string> {
  const { capturePath, siteUrl } = localEnvironment();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const lines = (await readFile(capturePath, "utf8")).trim().split("\n").filter(Boolean);
    const url = lines.at(-1);
    if (url) {
      const parsed = new URL(url);
      if (parsed.origin !== new URL(siteUrl).origin) throw new Error("Captured magic link must stay on the loopback site origin");
      return url;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No captured magic link for ${email}`);
}

export async function requestMagicLink(page: Page, email: string, next = "/workspace/saved") {
  await clearCapturedMagicLinks();
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  return capturedMagicLink(email);
}

export async function authenticatePage(page: Page, email: string, next = "/workspace/saved") {
  const url = await requestMagicLink(page, email, next);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL((current) => current.pathname === next.split("?", 1)[0]);
  await expect(page.locator("html")).toHaveAttribute("data-app-hydrated", "true");
  return url;
}

export async function sessionCount(userId: string) {
  const sql = database();
  try {
    const [result] = await sql<{ count: string }[]>`select count(*)::text as count from auth.session where user_id = ${userId}::uuid`;
    return Number(result?.count ?? 0);
  } finally {
    await sql.end();
  }
}
