import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";
import { userTable } from "./user.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Encrypted provider API keys for BYOK mode
 */
export const providerKeyTable = pgTable(
  "provider_key",
  {
    id: generateDefaultId(),
    userId: uuid()
      .notNull()
      .references(() => userTable.id),
    provider: text().notNull(),
    encryptedKey: text().notNull(),
    keyHint: text().notNull(),
    modelPreference: text("model_preference"),
    createdAt: generateDefaultDate(),
    updatedAt: generateDefaultDate(),
  },
  (table) => [
    uniqueIndex().on(table.id),
    uniqueIndex().on(table.userId, table.provider),
  ],
);

export type InsertProviderKey = InferInsertModel<typeof providerKeyTable>;
export type SelectProviderKey = InferSelectModel<typeof providerKeyTable>;
