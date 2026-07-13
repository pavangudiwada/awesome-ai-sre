import { describe, expect, it } from "vitest";

import {
  MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
  suppressUnsafeRows,
} from "./company-analytics-report";

const baseRow = {
  companySlug: "robusta-dev",
  companyName: "Robusta.dev",
  profileViews: 12,
  outboundClicks: 3,
  updateViews: 2,
  shares: 5,
  followerCount: 4,
};

describe("company analytics privacy threshold", () => {
  it("suppresses a company below ten unique daily-hash actors", () => {
    expect(
      suppressUnsafeRows([
        { ...baseRow, uniqueDailyHashActors: 9 },
      ]),
    ).toEqual([]);
  });

  it("includes a company only at or above the threshold", () => {
    const rows = suppressUnsafeRows([
      {
        ...baseRow,
        uniqueDailyHashActors: MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.companySlug).toBe("robusta-dev");
    expect(rows[0]?.shares).toBe(5);
  });

  it("allows a suppressed follower count without turning it into zero", () => {
    const rows = suppressUnsafeRows([
      {
        ...baseRow,
        followerCount: null,
        uniqueDailyHashActors: MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
      },
    ]);

    expect(rows[0]?.followerCount).toBeNull();
  });
});
