import { describe, expect, it } from "vitest";

import {
  assetWarningIdentity,
  catalogWarningIdentity,
  findNewWarningIdentities,
} from "./validation-warning-baseline";

describe("validation warning regression baseline", () => {
  it("uses stable catalog code and record identity, not message text", () => {
    const identity = catalogWarningIdentity({
      code: "missing_asset_reference",
      sourceFile: "tools/operate/example.yaml",
      recordId: "example:logo",
    });

    expect(identity).toBe(
      "missing_asset_reference|tools/operate/example.yaml|example:logo",
    );
  });

  it("uses stable asset code, record, kind, and path identity", () => {
    expect(
      assetWarningIdentity({
        code: "screenshot_aspect_unexpected",
        family: "ai-sre",
        slug: "example",
        kind: "screenshot",
        assetPath: "/screenshots/example.png",
      }),
    ).toBe(
      "screenshot_aspect_unexpected|ai-sre|example|screenshot|/screenshots/example.png",
    );
  });

  it("fails a replacement warning even when the total count is unchanged", () => {
    expect(
      findNewWarningIdentities(
        ["warning|existing-record", "warning|new-record"],
        ["warning|existing-record", "warning|removed-record"],
      ),
    ).toEqual(["warning|new-record"]);
  });
});
