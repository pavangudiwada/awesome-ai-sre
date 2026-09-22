import { describe, expect, it } from "vitest";

import { fileBackedSlugsToRetire } from "./published-update-sync";

describe("published update sync", () => {
  it("retires only file-backed rows that no longer have published content", () => {
    expect(fileBackedSlugsToRetire(["keep", "retire"], new Set(["keep"]))).toEqual(["retire"]);
  });
});
