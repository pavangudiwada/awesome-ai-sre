import "server-only";

import { cookies } from "next/headers";

import {
  PENDING_AUTH_INTENT_COOKIE,
  clearPendingAuthIntentCookieOptions,
} from "@/lib/auth/pending-intent";
import { completePendingAuthIntent } from "@/lib/auth/actions";
import { internalReturnPathSchema } from "@/lib/auth/schemas";

export async function completeAuthRedirect(defaultReturnTo: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_AUTH_INTENT_COOKIE)?.value;
  let returnTo = internalReturnPathSchema.catch("/workspace/saved").parse(defaultReturnTo);

  if (token) {
    try {
      const completed = await completePendingAuthIntent(token);
      returnTo = completed.returnTo;
    } catch {
      // Authentication itself succeeded. An expired or already-consumed intent
      // must not turn a valid sign-in into a callback failure.
    } finally {
      cookieStore.set(
        PENDING_AUTH_INTENT_COOKIE,
        "",
        clearPendingAuthIntentCookieOptions(),
      );
    }
  }

  return returnTo;
}
