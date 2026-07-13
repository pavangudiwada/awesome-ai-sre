import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import {
  type PendingAuthIntentPayload,
  internalReturnPathSchema,
} from "./schemas";
import { verifyPendingAuthIntent } from "./pending-intent";

const practitionerIdSchema = z.string().uuid();

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required to complete this action");
    this.name = "AuthenticationRequiredError";
  }
}

export class InvalidPendingAuthIntentError extends Error {
  constructor() {
    super("The pending authentication action is invalid or expired");
    this.name = "InvalidPendingAuthIntentError";
  }
}

export async function getAuthenticatedPractitionerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;

  const parsedId = practitionerIdSchema.safeParse(data?.claims.sub);
  return parsedId.success ? parsedId.data : null;
}

export async function requireAuthenticatedPractitionerId(): Promise<string> {
  const practitionerId = await getAuthenticatedPractitionerId();
  if (!practitionerId) throw new AuthenticationRequiredError();
  return practitionerId;
}

export type CompletedPendingAuthIntent = {
  action: PendingAuthIntentPayload["action"];
  returnTo: string;
  slug: string;
};

/**
 * Applies only the two low-risk actions allowed to survive an auth redirect.
 * Notes and evaluation content are intentionally never serialized into an
 * intent token or accepted by this helper.
 */
export async function completePendingAuthIntent(
  token: string,
): Promise<CompletedPendingAuthIntent> {
  const intent = verifyPendingAuthIntent(token);
  if (!intent) throw new InvalidPendingAuthIntentError();

  const practitionerId = await requireAuthenticatedPractitionerId();
  const supabase = await createClient();

  const result =
    intent.action === "save"
      ? await supabase.from("saved_products").upsert(
          {
            practitioner_id: practitionerId,
            product_slug: intent.slug,
          },
          {
            ignoreDuplicates: true,
            onConflict: "practitioner_id,product_slug",
          },
        )
      : await supabase.from("company_follows").upsert(
          {
            company_slug: intent.slug,
            practitioner_id: practitionerId,
          },
          {
            ignoreDuplicates: true,
            onConflict: "practitioner_id,company_slug",
          },
        );

  if (result.error) throw result.error;

  return {
    action: intent.action,
    returnTo: internalReturnPathSchema.parse(intent.returnTo),
    slug: intent.slug,
  };
}
