import "server-only";

import { isIP } from "node:net";

export const UNTRUSTED_NETWORK_SOURCE = "untrusted-network";

/** exe appends the observed client address to X-Forwarded-For. */
export function trustedClientIp(
  headers: Headers,
  trustProxy = process.env.TRUST_PROXY,
): string {
  if (trustProxy !== "exe") return UNTRUSTED_NETWORK_SOURCE;
  const candidate = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return candidate && isIP(candidate) !== 0
    ? candidate
    : UNTRUSTED_NETWORK_SOURCE;
}
