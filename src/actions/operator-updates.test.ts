import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isOperator: vi.fn(() => true),
  practitioner: vi.fn(() => "10000000-0000-4000-8000-000000000001"),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  sql: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/db", () => ({ getPostgresClient: () => mocks.sql }));
vi.mock("@/lib/auth/actions", () => ({ getAuthenticatedPractitionerId: mocks.practitioner }));
vi.mock("@/lib/operator/authorization", () => ({ isOperatorEmail: mocks.isOperator }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath, updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { operatorUpdateInputSchema } from "@/lib/operator/updates";
import { publishOperatorUpdateAction, retireOperatorUpdateAction } from "./operator-updates";

describe("operator update input", () => {
  it("accepts a source-linked alert and rejects non-HTTPS sources", () => {
    const input = {
      slug: "acme-funding",
      title: "Acme raised funding",
      summary: "Acme announced a new round.",
      sourceUrl: "https://example.com/news",
      companySlug: "acme",
      productSlug: "",
      publishedAt: "2026-09-22T12:30",
    };
    expect(operatorUpdateInputSchema.safeParse(input).success).toBe(true);
    expect(operatorUpdateInputSchema.safeParse({ ...input, sourceUrl: "http://example.com" }).success).toBe(false);
  });

  it("immediately invalidates published alerts after publish and retirement", async () => {
    mocks.sql.mockResolvedValueOnce([{ email: "owner@example.com", email_verified: true }]).mockResolvedValueOnce([]);
    const publish = new FormData();
    for (const [key, value] of Object.entries({
      slug: "acme-funding", title: "Acme raised funding", summary: "Acme announced a round.",
      sourceUrl: "https://example.com/news", publishedAt: "2026-09-22T12:30",
    })) publish.set(key, value);
    await publishOperatorUpdateAction(publish);

    mocks.sql.mockResolvedValueOnce([{ email: "owner@example.com", email_verified: true }]).mockResolvedValueOnce([]);
    const retire = new FormData();
    retire.set("slug", "acme-funding");
    await retireOperatorUpdateAction(retire);

    expect(mocks.updateTag).toHaveBeenCalledTimes(2);
    expect(mocks.updateTag).toHaveBeenCalledWith("published-updates");
  });
});
