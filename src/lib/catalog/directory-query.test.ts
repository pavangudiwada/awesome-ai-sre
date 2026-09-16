import { describe, expect, it } from "vitest";

import {
  directoryHref,
  parseDirectoryQuery,
  serializeDirectoryQuery,
  type DirectoryQueryState,
} from "./directory-query";

const CATEGORIES = ["all", "ai-sre", "observability", "oss"] as const;

describe("directory query state", () => {
  it("uses compact defaults when the URL has no directory state", () => {
    const state = parseDirectoryQuery({}, CATEGORIES);

    expect(state).toEqual({
      query: "",
      category: "all",
      deployments: [],
      sort: "name-asc",
    });
    expect(directoryHref("/tools", state)).toBe("/tools");
  });

  it("parses a complete shareable directory URL", () => {
    expect(
      parseDirectoryQuery(
        {
          q: " incident ",
          category: "oss",
          deployment: ["hybrid", "on-prem"],
          sort: "newest",
        },
        CATEGORIES,
      ),
    ).toEqual({
      query: "incident",
      category: "oss",
      deployments: ["on-prem", "hybrid"],
      sort: "newest",
    });
  });

  it("ignores invalid and duplicate values", () => {
    expect(
      parseDirectoryQuery(
        {
          category: "unknown",
          deployment: ["hybrid", "invalid", "hybrid"],
          sort: "popular",
        },
        CATEGORIES,
      ),
    ).toEqual({
      query: "",
      category: "all",
      deployments: ["hybrid"],
      sort: "name-asc",
    });
  });

  it("serializes known values in deterministic order and omits defaults", () => {
    const state: DirectoryQueryState = {
      query: " incident ",
      category: "oss",
      deployments: ["hybrid", "saas", "on-prem"],
      sort: "newest",
    };

    expect(serializeDirectoryQuery(state).toString()).toBe(
      "q=incident&category=oss&deployment=saas&deployment=on-prem&deployment=hybrid&sort=newest",
    );
  });

  it("round trips canonical state", () => {
    const state: DirectoryQueryState = {
      query: "agent",
      category: "ai-sre",
      deployments: ["saas", "hybrid"],
      sort: "name-desc",
    };
    const params = serializeDirectoryQuery(state);

    expect(
      parseDirectoryQuery(
        Object.fromEntries(
          [...new Set(params.keys())].map((key) => [key, params.getAll(key)]),
        ),
        CATEGORIES,
      ),
    ).toEqual(state);
  });
});
