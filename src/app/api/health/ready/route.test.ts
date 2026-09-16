import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = vi.fn();
  const sql = Object.assign(vi.fn(), {
    begin: vi.fn(async (callback: (client: typeof transaction) => Promise<boolean>) => callback(transaction)),
  });
  return { sql, transaction };
});
vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));

import { GET } from "./route";

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    mocks.sql.mockClear();
    mocks.sql.begin.mockClear();
    mocks.transaction.mockReset();
  });
  it("returns generic unavailable status without a database URL", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ready: false });
    if (previous) process.env.DATABASE_URL = previous;
  });

  it("requires the application schema before reporting ready", async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://watchlist:watchlist@127.0.0.1:5432/watchlist";
    mocks.transaction.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ready: true }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
    if (previous) process.env.DATABASE_URL = previous;
    else delete process.env.DATABASE_URL;
  });

  it("rejects a reachable database that is missing the application schema", async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://watchlist:watchlist@127.0.0.1:5432/watchlist";
    mocks.transaction.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ready: false }]);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ready: false });
    if (previous) process.env.DATABASE_URL = previous;
    else delete process.env.DATABASE_URL;
  });
});
