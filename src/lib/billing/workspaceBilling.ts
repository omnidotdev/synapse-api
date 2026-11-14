import { and, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { apiKeyTable, usageEventTable, workspaceTable } from "lib/db/schema";

import type { dbPool } from "lib/db";

/**
 * Direct Synapse keys belong to a workspace (an Omni organization) and bill it.
 *
 * Synapse checkout subscribes a workspace, so the tier, the included request
 * allowance, overage, and the spending limit all live on the organization's
 * Aether account. A direct key therefore meters and resolves its tier against
 * the organization that owns it, never against the user who created it. A
 * user's personal workspace is the default home for their keys
 */

type Db = Pick<typeof dbPool, "select">;

/** Aether billing entity a direct key meters as */
interface WorkspaceBillingEntity {
  entityType: "organization";
  entityId: string;
}

/**
 * The workspace a direct key bills, or `null` when the key bills something
 * else: a product-scoped key bills its product entity, and a legacy direct key
 * created before keys belonged to a workspace still bills its owner
 */
export const workspaceBillingEntity = (key: {
  appId: string | null;
  organizationId: string | null;
}): WorkspaceBillingEntity | null =>
  key.appId || !key.organizationId
    ? null
    : { entityType: "organization", entityId: key.organizationId };

/** Start of the current UTC calendar month (the request quota window) */
export const startOfUtcMonth = (now = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/**
 * Count a workspace's direct requests since `since`: every usage event from any
 * direct key that bills the organization, whichever member's key sent it, so
 * the quota is shared across the workspace like the subscription is
 */
export const countWorkspaceRequests = async (
  db: Db,
  organizationId: string,
  since: Date,
): Promise<number> => {
  const workspaceKeys = db
    .select({ id: apiKeyTable.id })
    .from(apiKeyTable)
    .where(
      and(
        eq(apiKeyTable.organizationId, organizationId),
        isNull(apiKeyTable.appId),
      ),
    );

  const [row] = await db
    .select({ requestCount: sql<number>`count(*)::int` })
    .from(usageEventTable)
    .where(
      and(
        inArray(usageEventTable.apiKeyId, workspaceKeys),
        gte(usageEventTable.createdAt, since.toISOString()),
      ),
    );

  return row?.requestCount ?? 0;
};

/**
 * Count a legacy key owner's direct requests since `since` (keys that predate
 * workspace ownership bill their owner)
 */
export const countUserRequests = async (
  db: Db,
  userId: string,
  since: Date,
): Promise<number> => {
  const [row] = await db
    .select({ requestCount: sql<number>`count(*)::int` })
    .from(usageEventTable)
    .where(
      and(
        eq(usageEventTable.userId, userId),
        gte(usageEventTable.createdAt, since.toISOString()),
      ),
    );

  return row?.requestCount ?? 0;
};

/**
 * Count the active user-created keys in a workspace toward `max_api_keys`.
 * Managed keys are system-provisioned by other Omni products and never count
 */
export const countWorkspaceKeys = async (
  db: Db,
  organizationId: string,
): Promise<number> => {
  const rows = await db
    .select({ id: apiKeyTable.id })
    .from(apiKeyTable)
    .where(
      and(
        eq(apiKeyTable.organizationId, organizationId),
        isNull(apiKeyTable.revokedAt),
        ne(apiKeyTable.mode, "managed"),
      ),
    );

  return rows.length;
};

/**
 * Resolve the workspace a new direct key belongs to. An explicit
 * `organizationId` wins; a key scoped to a Synapse workspace resource inherits
 * that resource's organization. A key must belong to a workspace, so neither
 * is a user error rather than a silent fallback to billing the user
 */
export const resolveKeyOrganization = async (
  db: Db,
  input: { organizationId?: string | null; workspaceId?: string | null },
): Promise<string> => {
  let resourceOrganizationId: string | null = null;

  if (input.workspaceId) {
    const [workspace] = await db
      .select({ organizationId: workspaceTable.organizationId })
      .from(workspaceTable)
      .where(eq(workspaceTable.id, input.workspaceId));

    if (!workspace) {
      throw new GraphQLError("Workspace not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }

    resourceOrganizationId = workspace.organizationId;
  }

  if (
    input.organizationId &&
    resourceOrganizationId &&
    input.organizationId !== resourceOrganizationId
  ) {
    throw new GraphQLError("The resource belongs to a different workspace", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const organizationId = input.organizationId ?? resourceOrganizationId;

  if (!organizationId) {
    throw new GraphQLError("Choose a workspace for this key", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return organizationId;
};
