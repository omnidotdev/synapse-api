import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { apiKeyTable } from "./apiKey.table";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Token usage events for billing
 */
export const usageEventTable = pgTable(
  "usage_event",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id),
    workspaceId: uuid(),
    apiKeyId: uuid()
      .notNull()
      .references(() => apiKeyTable.id),
    provider: text().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    costCents: integer().notNull().default(0),
    mode: text().notNull(),
    // Idempotency key for at-least-once gateway delivery. Set to the client
    // supplied event id when present, otherwise derived from the reported
    // batch so a retried flush does not double-insert. Nullable so historical
    // rows (predating this column) remain valid; new rows always set it
    dedupeKey: text(),
    createdAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.dedupeKey),
    index().on(table.userId),
    index().on(table.apiKeyId),
    index().on(table.createdAt),
  ],
);

export type InsertUsageEvent = InferInsertModel<typeof usageEventTable>;
export type SelectUsageEvent = InferSelectModel<typeof usageEventTable>;
