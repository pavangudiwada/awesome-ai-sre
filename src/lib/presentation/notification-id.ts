import { z } from "zod";

const persistedUpdateIdSchema = z.string().uuid();
export const notificationIdSchema = z.union([
  persistedUpdateIdSchema,
  z.string().regex(/^news:[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);

/** File-only news never has a persisted read state or a mark-read action. */
export function isPersistedUpdateId(id: string): boolean {
  return persistedUpdateIdSchema.safeParse(id).success;
}
