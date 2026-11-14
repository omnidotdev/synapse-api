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
    /**
     * Workspace (Omni organization) a direct Synapse key belongs to and bills.
     * Synapse subscriptions are held by a workspace, so a direct key meters,
     * resolves its tier, and counts toward quotas against this organization
     * (a user's personal workspace by default). Null for product-scoped keys,
     * which bill their own product entity, and for legacy direct keys created
     * before keys belonged to a workspace (those still bill the key owner)
     */
    organizationId: uuid(),
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
    index().on(table.organizationId),
    // One current managed key per (user, source, product, billing entity), so
    // a user in two organizations holds independent keys. Rotated keys in
    // their grace window (expires_at set) and revoked keys fall outside it.
    // Direct keys carry no product or entity, so those coalesce to '' to stay
    // unique too (a plain unique index treats NULLs as distinct)
    uniqueIndex("api_key_managed_scope_idx")
      .on(
        table.userId,
        table.name,
        sql`coalesce(${table.appId}, '')`,
        sql`coalesce(${table.billingEntityType}, '')`,
        sql`coalesce(${table.billingEntityId}, '')`,
      )
      .where(
        sql`${table.mode} = 'managed' AND ${table.revokedAt} IS NULL AND ${table.expiresAt} IS NULL`,
      ),
    // The gateway splices app_id into Aether URL paths, so only a lowercase
    // slug is ever stored. A product key always carries a complete billing
    // entity and a direct key carries none, so a key can never be half-scoped
    check(
      "api_key_app_id_slug",
      sql`${table.appId} IS NULL OR ${table.appId} ~ '^[a-z][a-z0-9-]{0,62}$'`,
    ),
    // A product key bills its product entity, never a Synapse workspace
    check(
      "api_key_organization_direct_only",
      sql`${table.organizationId} IS NULL OR ${table.appId} IS NULL`,
    ),
    check(
      "api_key_billing_entity_scoped",
      sql`(${table.appId} IS NULL AND ${table.billingEntityType} IS NULL AND ${table.billingEntityId} IS NULL) OR (${table.appId} IS NOT NULL AND ${table.billingEntityType} IN ('user', 'organization') AND ${table.billingEntityId} IS NOT NULL)`,
    ),
  ],
);

export type InsertApiKey = InferInsertModel<typeof apiKeyTable>;
export type SelectApiKey = InferSelectModel<typeof apiKeyTable>;
