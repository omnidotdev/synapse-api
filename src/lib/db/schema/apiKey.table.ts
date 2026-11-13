import { sql } from "drizzle-orm";
import {
  check,
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
    /**
     * Product this key bills against (the Aether `appId`), set when another
     * Omni product provisions per-end-user managed access. Null for direct
     * Synapse keys, which bill the gateway's own app
     */
    appId: text(),
    /** Billing entity type within the product (`user` or `organization`) */
    billingEntityType: text(),
    /** Billing entity id within the product */
    billingEntityId: text(),
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
    // The gateway splices app_id into Aether URL paths, so only a lowercase
    // slug is ever stored. A product key always carries a complete billing
    // entity and a direct key carries none, so a key can never be half-scoped
    check(
      "api_key_app_id_slug",
      sql`${table.appId} IS NULL OR ${table.appId} ~ '^[a-z][a-z0-9-]{0,62}$'`,
    ),
    check(
      "api_key_billing_entity_scoped",
      sql`(${table.appId} IS NULL AND ${table.billingEntityType} IS NULL AND ${table.billingEntityId} IS NULL) OR (${table.appId} IS NOT NULL AND ${table.billingEntityType} IN ('user', 'organization') AND ${table.billingEntityId} IS NOT NULL)`,
    ),
  ],
);

export type InsertApiKey = InferInsertModel<typeof apiKeyTable>;
export type SelectApiKey = InferSelectModel<typeof apiKeyTable>;
