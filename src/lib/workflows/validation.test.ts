import { describe, expect, it } from "vitest";

import {
  editorialSubmissionSchema,
  evaluationSchema,
  parseOptionalCatalogSlug,
  productNoteBodySchema,
} from "./validation";

describe("workflow input validation", () => {
  it("normalizes an empty note so the action can delete it", () => {
    expect(productNoteBodySchema.parse("  \n ")).toBe("");
  });

  it("only accepts decisions exposed by the evaluation UI", () => {
    expect(evaluationSchema.parse({ name: "Pilot" }).decision).toBe(
      "undecided",
    );
    expect(() =>
      evaluationSchema.parse({ name: "Pilot", decision: "maybe" }),
    ).toThrow();
  });

  it("turns optional form sentinels into absent catalog subjects", () => {
    expect(parseOptionalCatalogSlug("none")).toBeUndefined();
    expect(parseOptionalCatalogSlug("")).toBeUndefined();
    expect(parseOptionalCatalogSlug(null)).toBeUndefined();
    expect(parseOptionalCatalogSlug("runwhen")).toBe("runwhen");
  });

  it("leaves invalid optional values for the outer safe parser to reject", () => {
    expect(() => parseOptionalCatalogSlug("Not a slug")).not.toThrow();
    expect(
      editorialSubmissionSchema.safeParse({
        submissionType: "correction",
        relationship: "practitioner",
        productSlug: parseOptionalCatalogSlug("Not a slug"),
        sourceUrl: "https://example.com/source",
        message: "A sufficiently detailed correction for review.",
        contactEmail: "person@example.com",
        turnstileToken: "token",
      }).success,
    ).toBe(false);
  });

  it("requires anti-bot proof and submission bounds", () => {
    expect(() =>
      editorialSubmissionSchema.parse({
        submissionType: "correction",
        relationship: "practitioner",
        productSlug: "runwhen",
        sourceUrl: "https://example.com/source",
        message: "A sufficiently detailed correction for review.",
        contactEmail: "person@example.com",
      }),
    ).toThrow();
  });
});
