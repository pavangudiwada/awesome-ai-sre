import { describe, expect, it } from "vitest";

import {
  internalReturnPathSchema,
  pendingAuthIntentInputSchema,
} from "./schemas";

describe("auth input schemas", () => {
  it.each(["https://example.com", "//example.com", "/\\example.com"])(
    "rejects an external return path: %s",
    (returnTo) => {
      expect(internalReturnPathSchema.safeParse(returnTo).success).toBe(false);
    },
  );

  it("does not accept note or evaluation data in a pending intent", () => {
    expect(
      pendingAuthIntentInputSchema.safeParse({
        action: "save",
        note: "private material",
        returnTo: "/tools/runwhen",
        slug: "runwhen",
      }).success,
    ).toBe(false);
  });

  it("does not accept any pending action beyond save or follow", () => {
    expect(
      pendingAuthIntentInputSchema.safeParse({
        action: "evaluate",
        returnTo: "/workspace/evaluations",
        slug: "runwhen",
      }).success,
    ).toBe(false);
  });
});
