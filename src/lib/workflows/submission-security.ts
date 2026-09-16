import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

const submissionSecurityEnvironmentSchema = z.object({
  TURNSTILE_SECRET_KEY: z.string().min(1),
  SUBMISSION_HASH_SECRET: z.string().min(32),
});

export function getSubmissionSecurityEnvironment() {
  return submissionSecurityEnvironmentSchema.parse({
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    SUBMISSION_HASH_SECRET: process.env.SUBMISSION_HASH_SECRET,
  });
}

export function hashSubmissionIdentity(value: string, secret: string) {
  return createHmac("sha256", z.string().min(32).parse(secret))
    .update(value)
    .digest("hex");
}

export async function verifyEditorialTurnstile(options: {
  token: string;
  ipAddress: string;
  secret: string;
  fetchImpl?: typeof fetch;
}) {
  try {
    const body = new URLSearchParams({
      secret: options.secret,
      response: options.token,
    });
    if (isIP(options.ipAddress)) body.set("remoteip", options.ipAddress);
    const response = await (options.fetchImpl ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    if (!response.ok) return false;

    const result = turnstileResponseSchema.safeParse(await response.json());
    return Boolean(
      result.success &&
        result.data.success &&
        result.data.action === "editorial_submission",
    );
  } catch {
    return false;
  }
}
