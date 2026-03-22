import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate } from "lib/db/util";
import { apiKeyTable } from "./apiKey.table";
import { providerKeyTable } from "./providerKey.table";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Junction linking Synapse API keys to provider vault keys
 *
 * When a row exists, requests made with the API key use the
 * linked provider key for that provider instead of Synapse credits.
 */
export const apiKeyProviderTable = pgTable(
  "api_key_provider",
  {
    apiKeyId: uuid()
      .notNull()
      .references(() => apiKeyTable.id, { onDelete: "cascade" }),
    providerKeyId: uuid()
      .notNull()
      .references(() => providerKeyTable.id, { onDelete: "cascade" }),
    createdAt: generateDefaultDate(),
  },
  (table) => [primaryKey({ columns: [table.apiKeyId, table.providerKeyId] })],
);

export type InsertApiKeyProvider = InferInsertModel<typeof apiKeyProviderTable>;
export type SelectApiKeyProvider = InferSelectModel<typeof apiKeyProviderTable>;
