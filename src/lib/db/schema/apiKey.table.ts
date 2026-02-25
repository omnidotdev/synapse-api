import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * API key table
 */
export const apiKeyTable = pgTable(
  "api_key",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id),
    workspaceId: uuid(),
    keyHash: text().notNull().unique(),
    keyHint: text().notNull(),
    name: text().notNull(),
    mode: text().notNull().default("byok"),
    lastUsedAt: timestamp({ precision: 6, mode: "string", withTimezone: true }),
    expiresAt: timestamp({ precision: 6, mode: "string", withTimezone: true }),
    revokedAt: timestamp({ precision: 6, mode: "string", withTimezone: true }),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.keyHash),
    index().on(table.userId),
  ],
);

export type InsertApiKey = InferInsertModel<typeof apiKeyTable>;
export type SelectApiKey = InferSelectModel<typeof apiKeyTable>;
