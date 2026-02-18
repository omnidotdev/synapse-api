import { boolean, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * User preference table
 */
export const userPreferenceTable = pgTable(
  "user_preference",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id)
      .unique(),
    defaultProvider: text(),
    notifyUsageThreshold: boolean().notNull().default(true),
    notifyKeyExpiry: boolean().notNull().default(true),
    updatedAt: generateDefaultDate(),
  },
  (table) => [uniqueIndex().on(table.id), uniqueIndex().on(table.userId)],
);

export type InsertUserPreference = InferInsertModel<typeof userPreferenceTable>;
export type SelectUserPreference = InferSelectModel<typeof userPreferenceTable>;
