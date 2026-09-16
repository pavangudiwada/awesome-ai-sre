import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { z } from "zod";

import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  getDatabase,
} from "@/db";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  RESEND_API_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  RESEND_SENDER_EMAIL: z.preprocess((value) => value || undefined, z.string().email().optional()),
  GOOGLE_CLIENT_ID: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  GITHUB_CLIENT_ID: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  GITHUB_CLIENT_SECRET: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  AUTH_E2E_CAPTURE_PATH: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
});

type AuthEnvironment = z.infer<typeof environmentSchema>;

export function isAuthConfigured(): boolean {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) return false;
  return new URL(parsed.data.BETTER_AUTH_URL).origin === new URL(parsed.data.NEXT_PUBLIC_SITE_URL).origin;
}

export function isMagicLinkConfigured(): boolean {
  const environment = environmentSchema.safeParse(process.env);
  return environment.success && Boolean(
    (environment.data.RESEND_API_KEY && environment.data.RESEND_SENDER_EMAIL) ||
      (environment.data.AUTH_E2E_CAPTURE_PATH &&
        process.env.NODE_ENV !== "production" &&
        isLoopbackOrigin(environment.data.BETTER_AUTH_URL) &&
        isLoopbackOrigin(environment.data.NEXT_PUBLIC_SITE_URL)),
  );
}

export function isOAuthProviderConfigured(provider: "google" | "github"): boolean {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function getEnvironment(): AuthEnvironment {
  return environmentSchema.parse(process.env);
}

function trustedOrigins(environment: AuthEnvironment): string[] {
  const canonical = new URL(environment.NEXT_PUBLIC_SITE_URL).origin;
  const authOrigin = new URL(environment.BETTER_AUTH_URL).origin;
  if (canonical !== authOrigin) throw new Error("BETTER_AUTH_URL must match NEXT_PUBLIC_SITE_URL");
  return [...new Set([canonical, authOrigin])];
}

function isLoopbackOrigin(url: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

async function deliverMagicLink(
  environment: AuthEnvironment,
  email: string,
  url: string,
) {
  const capturePath = environment.AUTH_E2E_CAPTURE_PATH;
  if (capturePath && process.env.NODE_ENV !== "production" && isLoopbackOrigin(environment.BETTER_AUTH_URL) && isLoopbackOrigin(environment.NEXT_PUBLIC_SITE_URL)) {
    await mkdir(dirname(capturePath), { recursive: true, mode: 0o700 });
    await appendFile(capturePath, `${url}\n`, { mode: 0o600 });
    return;
  }
  if (capturePath) throw new Error("AUTH_E2E_CAPTURE_PATH requires loopback auth and site origins outside production");

  if (!environment.RESEND_API_KEY || !environment.RESEND_SENDER_EMAIL) {
    throw new Error("Magic-link delivery is unavailable");
  }
  const resend = new Resend(environment.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: environment.RESEND_SENDER_EMAIL,
    to: email,
    subject: "Your AI SRE Watchlist sign-in link",
    text: `Use this one-time sign-in link: ${url}`,
  });
  if (result.error) throw new Error("Unable to send sign-in link");
}

function createConfiguredAuth() {
  return betterAuth({
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schemaName: "auth",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    secret: getEnvironment().BETTER_AUTH_SECRET,
    baseURL: getEnvironment().BETTER_AUTH_URL,
    trustedOrigins: trustedOrigins(getEnvironment()),
    advanced: {
      database: { generateId: "uuid" },
      // The exe proxy appends client IPs to an inbound X-Forwarded-For chain.
      // Until a trusted proxy wrapper supplies a canonical header, do not accept
      // attacker-controlled forwarding headers for session metadata or limits.
      ipAddress: { disableIpTracking: true },
    },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
        : {}),
    },
    plugins: [
      magicLink({
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => deliverMagicLink(getEnvironment(), email, url),
      }),
      nextCookies(),
    ],
  });
}

let cachedAuth: ReturnType<typeof createConfiguredAuth> | undefined;

export function getAuth(): ReturnType<typeof createConfiguredAuth> {
  if (!cachedAuth) cachedAuth = createConfiguredAuth();
  return cachedAuth;
}
