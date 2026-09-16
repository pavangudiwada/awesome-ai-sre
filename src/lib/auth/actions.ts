import "server-only";

import { z } from "zod";

import { workflowStore } from "@/lib/workflows/store";
import { getAuth, isAuthConfigured } from "./server";
import { headers } from "next/headers";

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
  if (!isAuthConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  const parsedId = practitionerIdSchema.safeParse(session?.user.id);
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
  if (intent.action === "save") await workflowStore().saveProduct(practitionerId, intent.slug, true);
  else await workflowStore().followCompany(practitionerId, intent.slug, true);

  return {
    action: intent.action,
    returnTo: internalReturnPathSchema.parse(intent.returnTo),
    slug: intent.slug,
  };
}
