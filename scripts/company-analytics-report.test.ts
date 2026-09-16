import { describe, expect, it } from "vitest";

import {
  hasReportableDailyCohort,
  MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
  suppressUnsafeRows,
  uniqueDailyNetworkCohortSize,
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
        { ...baseRow, maximumUniqueDailyActors: 9 },
      ]),
    ).toEqual([]);
  });

  it("includes a company only at or above the threshold", () => {
    const rows = suppressUnsafeRows([
      {
        ...baseRow,
        maximumUniqueDailyActors: MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
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
        maximumUniqueDailyActors: MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
      },
    ]);

    expect(rows[0]?.followerCount).toBeNull();
  });

  it("does not let one visitor across ten days satisfy a ten-person cohort", () => {
    expect(hasReportableDailyCohort(Array.from({ length: 10 }, () => 1))).toBe(
      false,
    );
  });

  it("keeps the cohort locked when one network ignores Set-Cookie repeatedly", () => {
    const networkHash = "a".repeat(64);
    const adversarialRequests = Array.from(
      { length: MINIMUM_UNIQUE_DAILY_HASH_ACTORS + 2 },
      () => networkHash,
    );
    const cohortSize = uniqueDailyNetworkCohortSize(adversarialRequests);

    expect(cohortSize).toBe(1);
    expect(hasReportableDailyCohort([cohortSize])).toBe(false);
  });

  it("allows a UTC day with ten distinct daily pseudonyms", () => {
    expect(
      hasReportableDailyCohort([
        2,
        MINIMUM_UNIQUE_DAILY_HASH_ACTORS,
        3,
      ]),
    ).toBe(true);
  });
});
