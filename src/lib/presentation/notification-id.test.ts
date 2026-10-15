import { describe, expect, it } from "vitest";
import { isPersistedUpdateId, notificationIdSchema } from "./notification-id";

describe("notification identity", () => {
  it("accepts separate file identity without treating it as a persisted read ID", () => {
    expect(notificationIdSchema.safeParse("news:rootly-ai-instructions").success).toBe(true);
    expect(isPersistedUpdateId("news:rootly-ai-instructions")).toBe(false);
    expect(isPersistedUpdateId("00000000-0000-4000-8000-000000000001")).toBe(true);
  });
  it.each(["news:", "news:../secret", "news:UPPER", "not-a-uuid", "published:00000000-0000-4000-8000-000000000001"])("rejects invalid notification ID %s", (id) => {
    expect(notificationIdSchema.safeParse(id).success).toBe(false);
    expect(isPersistedUpdateId(id)).toBe(false);
  });
});
