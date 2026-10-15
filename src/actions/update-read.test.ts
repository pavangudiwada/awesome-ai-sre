import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ practitioner: vi.fn(), markRead: vi.fn(), revalidate: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/auth/actions", () => ({ getAuthenticatedPractitionerId: mocks.practitioner }));
vi.mock("@/lib/workflows/store", () => ({ workflowStore: () => ({ markUpdateRead: mocks.markRead }) }));
import { markUpdateReadAction } from "./workflows";

beforeEach(() => { vi.clearAllMocks(); });
const uuid = "00000000-0000-4000-8000-000000000001";

describe("unchanged mark-update-read authorization", () => {
  it.each(["news:public-launch", "invalid", ""])("rejects non-database ID %s before auth or a write", async (id) => {
    const form = new FormData();
    form.set("updateId", id);
    await expect(markUpdateReadAction(form)).rejects.toThrow();
    expect(mocks.practitioner).not.toHaveBeenCalled();
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("still requires authentication for a real UUID", async () => {
    mocks.practitioner.mockResolvedValue(null);
    const form = new FormData(); form.set("updateId", uuid);
    await expect(markUpdateReadAction(form)).rejects.toThrow("redirect:/sign-in?next=%2Fupdates");
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("uses only the verified session subject for a real update read", async () => {
    mocks.practitioner.mockResolvedValue("verified-practitioner");
    const form = new FormData(); form.set("updateId", uuid); form.set("practitionerId", "untrusted-person");
    await markUpdateReadAction(form);
    expect(mocks.markRead).toHaveBeenCalledWith("verified-practitioner", uuid);
  });
});
