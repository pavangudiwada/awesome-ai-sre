import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  completeAuthRedirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/complete-callback", () => ({
  completeAuthRedirect: mocks.completeAuthRedirect,
}));

import { GET as complete } from "./complete/route";
import { GET as retiredCallback } from "./callback/route";
import { GET as retiredConfirm } from "./confirm/route";
import { publicAuthRedirectUrl } from "@/lib/auth/public-redirect";

const originalEnvironment = {
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};
const publicEnvironment = {
  BETTER_AUTH_URL: "https://aisrewatchlist.com",
  NEXT_PUBLIC_SITE_URL: "https://aisrewatchlist.com",
};

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("auth public redirects", () => {
  beforeEach(() => {
    Object.assign(process.env, publicEnvironment);
    mocks.completeAuthRedirect.mockReset();
  });

  afterAll(restoreEnvironment);

  it("keeps a magic-link completion on the configured public origin behind the internal proxy", async () => {
    mocks.completeAuthRedirect.mockResolvedValue("/workspace/saved");

    const response = await complete(
      new NextRequest("http://127.0.0.1:8000/auth/complete?next=%2Fworkspace%2Fsaved"),
    );

    expect(response.headers.get("location")).toBe("https://aisrewatchlist.com/workspace/saved");
  });

  it("uses the safe default when an auth completion receives a hostile return target", async () => {
    mocks.completeAuthRedirect.mockResolvedValue("/workspace/saved");

    const response = await complete(
      new NextRequest("http://127.0.0.1:8000/auth/complete?next=https%3A%2F%2Fevil.example"),
    );

    expect(mocks.completeAuthRedirect).toHaveBeenCalledWith("/workspace/saved");
    expect(response.headers.get("location")).toBe("https://aisrewatchlist.com/workspace/saved");
  });

  it("keeps retired callback and confirm redirects on the configured public origin", () => {
    const callbackResponse = retiredCallback(
      new NextRequest("http://127.0.0.1:8000/auth/callback"),
    );
    const confirmResponse = retiredConfirm(
      new NextRequest("http://127.0.0.1:8000/auth/confirm"),
    );

    expect(callbackResponse.headers.get("location")).toBe(
      "https://aisrewatchlist.com/sign-in?error=Please+start+sign-in+again.",
    );
    expect(confirmResponse.headers.get("location")).toBe(
      "https://aisrewatchlist.com/sign-in?error=Please+request+a+new+sign-in+link.",
    );
  });

  it("rejects untrusted return paths and mismatched public auth configuration", () => {
    expect(() => publicAuthRedirectUrl("https://evil.example", publicEnvironment)).toThrow();
    expect(() => publicAuthRedirectUrl("//evil.example", publicEnvironment)).toThrow();
    expect(() => publicAuthRedirectUrl("/workspace/saved", {
      ...publicEnvironment,
      BETTER_AUTH_URL: "https://auth.example",
    })).toThrow("BETTER_AUTH_URL must match NEXT_PUBLIC_SITE_URL");
  });
});
