import { describe, expect, it } from "vitest";

import { digestPeriod, renderDigestText } from "./digest";

describe("newsletter digest planning", () => {
  it("uses completed UTC calendar periods", () => {
    expect(digestPeriod("weekly", new Date("2026-09-16T12:00:00Z"))).toMatchObject({
      start: "2026-09-07",
      end: "2026-09-14",
    });
    expect(digestPeriod("monthly", new Date("2026-09-16T12:00:00Z"))).toMatchObject({
      start: "2026-08-01",
      end: "2026-09-01",
    });
  });

  it("renders only supplied published updates as plain text", () => {
    const body = renderDigestText({
      frequency: "weekly",
      period: { start: "2026-09-07", end: "2026-09-14", label: "Sep 7–Sep 13, 2026" },
      updates: [{ id: "one", title: "Release one", summary: "A reviewed update.", contentPath: "/updates/release-one" }],
      siteUrl: "https://aisrewatchlist.example",
      unsubscribeUrl: "https://aisrewatchlist.example/newsletter/unsubscribe?token=signed",
    });
    expect(body).toContain("Release one");
    expect(body).toContain("https://aisrewatchlist.example/updates/release-one");
    expect(body).not.toContain("review candidate");
  });
});
