import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, desc, eq, isNull } from "drizzle-orm";
import { EXPORTABLE } from "graphile-export";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { checkOrgPermission } from "lib/authz/orgPermission";
import {
  countWorkspaceKeys,
  resolveKeyOrganization,
} from "lib/billing/workspaceBilling";
import { isProdEnv } from "lib/config/env.config";
import { MAX_API_KEYS } from "lib/config/planLimits.config";
import { generateApiKey } from "lib/crypto";
import {
  apiKeyProviderTable,
  apiKeyTable,
  providerKeyTable,
  workspaceTable,
} from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { logAuditEvent } from "lib/logging";
import { authz, billing } from "lib/providers";

import type { WardenRelation } from "@omnidotdev/providers";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

// Fallback limits when Aether is unreachable (catalog SSOT mirror)
const DEFAULT_LIMITS = {
  max_api_keys: MAX_API_KEYS,
};

/**
 * Assert the observer has a specific permission on an organization via Warden
 * (checked by identity provider id; fails closed in production)
 */
const assertOrgPermission = EXPORTABLE(
  (authz, checkOrgPermission, isProdEnv) =>
    (
      observer: { identityProviderId: string },
      organizationId: string,
      action: WardenRelation<"organization">,
    ) =>
      checkOrgPermission(authz, isProdEnv, observer, organizationId, action),
  [authz, checkOrgPermission, isProdEnv],
);

/**
 * API key management queries and mutations
 */
const apiKeysPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input GenerateApiKeyInput {
      name: String!
      mode: String!
      """
      Workspace (organization) the key belongs to and bills. Required unless
      \`workspaceId\` names a Synapse workspace resource, whose organization
      the key then inherits
      """
      organizationId: UUID
      workspaceId: UUID
    }

    type GenerateApiKeyPayload {
      rawKey: String!
      apiKeyId: UUID!
      keyHint: String!
    }

    type LinkedProviderInfo {
      id: UUID!
      provider: String!
      keyHint: String!
    }

    type ApiKeyInfo {
      id: UUID!
      name: String!
      keyHint: String!
      mode: String!
      createdAt: Datetime!
      lastUsedAt: Datetime
      expiresAt: Datetime
      revokedAt: Datetime
      linkedProviders: [LinkedProviderInfo!]!
    }

    extend type Observer {
      """
      List active API keys. With \`organizationId\`, every key that belongs to
      that workspace (members only); otherwise the current user's own keys,
      optionally filtered by Synapse workspace resource.
      """
      apiKeys(organizationId: UUID, workspaceId: UUID): [ApiKeyInfo!]!
    }

    extend type Mutation {
      """
      Generate a new API key. The raw key is returned once and never stored.
      """
      generateApiKey(input: GenerateApiKeyInput!): GenerateApiKeyPayload

      """
      Revoke an API key by setting its revokedAt timestamp.
      """
      revokeApiKey(id: UUID!): Boolean

      """
      Link a provider key to an API key so requests use that provider.
      """
      linkProviderKey(apiKeyId: UUID!, providerKeyId: UUID!): Boolean

      """
      Unlink a provider key from an API key.
      """
      unlinkProviderKey(apiKeyId: UUID!, providerKeyId: UUID!): Boolean
    }
  `,
  resolvers: {
    ApiKeyInfo: {
      linkedProviders: EXPORTABLE(
        (apiKeyProviderTable, eq, providerKeyTable) =>
          async function linkedProviders(
            apiKey: { id: string },
            _args: Record<string, never>,
            ctx: GraphQLContext,
          ) {
            const { db } = ctx;

            const rows = await db
              .select({
                id: providerKeyTable.id,
                provider: providerKeyTable.provider,
                keyHint: providerKeyTable.keyHint,
              })
              .from(apiKeyProviderTable)
              .innerJoin(
                providerKeyTable,
                eq(apiKeyProviderTable.providerKeyId, providerKeyTable.id),
              )
              .where(eq(apiKeyProviderTable.apiKeyId, apiKey.id));

            return rows;
          },
        [apiKeyProviderTable, eq, providerKeyTable],
      ),
    },
    Observer: {
      apiKeys: EXPORTABLE(
        (
          and,
          apiKeyTable,
          assertOrgPermission,
          desc,
          eq,
          isNull,
          workspaceTable,
        ) =>
          async function apiKeys(
            observer: { id: string; identityProviderId: string },
            args: { organizationId?: string; workspaceId?: string },
            ctx: GraphQLContext,
          ) {
            const { db } = ctx;

            // A workspace's keys are visible to all of its members, since the
            // workspace holds the subscription they bill
            if (args.organizationId) {
              await assertOrgPermission(
                observer,
                args.organizationId,
                "member",
              );

              return db
                .select()
                .from(apiKeyTable)
                .where(
                  and(
                    eq(apiKeyTable.organizationId, args.organizationId),
                    isNull(apiKeyTable.revokedAt),
                  ),
                )
                .orderBy(desc(apiKeyTable.createdAt));
            }

            // If workspace-scoped, verify org-level member permission
            if (args.workspaceId) {
              const [workspace] = await db
                .select({ organizationId: workspaceTable.organizationId })
                .from(workspaceTable)
                .where(eq(workspaceTable.id, args.workspaceId));

              if (workspace) {
                await assertOrgPermission(
                  observer,
                  workspace.organizationId,
                  "member",
                );
              }
            }

            const conditions = [
              eq(apiKeyTable.userId, observer.id),
              isNull(apiKeyTable.revokedAt),
            ];

            if (args.workspaceId) {
              conditions.push(eq(apiKeyTable.workspaceId, args.workspaceId));
            }

            return db
              .select()
              .from(apiKeyTable)
              .where(and(...conditions))
              .orderBy(desc(apiKeyTable.createdAt));
          },
        [
          and,
          apiKeyTable,
          assertOrgPermission,
          desc,
          eq,
          isNull,
          workspaceTable,
        ],
      ),
    },
    Mutation: {
      generateApiKey: EXPORTABLE(
        (
          GraphQLError,
          apiKeyTable,
          assertOrgPermission,
          billing,
          countWorkspaceKeys,
          DEFAULT_LIMITS,
          generateApiKey,
          isWithinLimit,
          logAuditEvent,
          publish,
          resolveKeyOrganization,
        ) =>
          async function generateApiKey_(
            _source: unknown,
            args: {
              input: {
                name: string;
                mode: string;
                organizationId?: string;
                workspaceId?: string;
              };
            },
            ctx: GraphQLContext,
          ) {
            const { observer, db } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            const { name, mode, workspaceId } = args.input;

            // Validate name length
            if (name.length > 100) {
              throw new GraphQLError("Name must be 100 characters or fewer", {
                extensions: { code: "BAD_USER_INPUT" },
              });
            }

            // Only "byok" is allowed via user-facing mutations; "managed"
            // keys are system-provisioned via internal routes
            if (mode !== "byok") {
              throw new GraphQLError(
                'Invalid key mode. Only "byok" is allowed',
                { extensions: { code: "BAD_USER_INPUT" } },
              );
            }

            // Every key belongs to the workspace it bills; creating one is a
            // workspace admin action (a personal workspace's owner qualifies)
            const organizationId = await resolveKeyOrganization(db, args.input);

            await assertOrgPermission(observer, organizationId, "admin");

            // The workspace's plan sets its key limit (external call, before
            // the transaction)
            const entitlements = await billing
              .getEntitlements("organization", organizationId, "synapse")
              .catch(() => null);

            const { raw, hash, hint } = generateApiKey();

            // Wrap count check + insert in a transaction to prevent TOCTOU races
            const apiKey = await db.transaction(async (tx) => {
              // Enforce max_api_keys across the workspace (managed keys are
              // excluded, they are system-provisioned by other Omni apps)
              const activeKeys = await countWorkspaceKeys(tx, organizationId);

              if (
                !isWithinLimit(
                  entitlements,
                  "max_api_keys",
                  activeKeys,
                  DEFAULT_LIMITS,
                )
              ) {
                throw new GraphQLError(
                  "API key limit reached. Upgrade your plan for more keys",
                  { extensions: { code: "QUOTA_EXCEEDED" } },
                );
              }

              const [inserted] = await tx
                .insert(apiKeyTable)
                .values({
                  userId: observer.id,
                  name,
                  mode,
                  organizationId,
                  workspaceId: workspaceId ?? null,
                  keyHash: hash,
                  keyHint: hint,
                })
                .returning();

              return inserted;
            });

            // Publish event (best-effort, fire-and-forget)
            void publish({
              type: "synapse.api_key.created",
              source: "omni.synapse",
              organizationId,
              subject: observer.id,
              data: {
                apiKeyId: apiKey.id,
                name,
                mode,
                organizationId,
                workspaceId: workspaceId ?? null,
              },
            });

            // Audit log (gated by audit_logs entitlement)
            void logAuditEvent(
              {
                userId: observer.id,
                userIdpId: observer.identityProviderId,
                workspaceId: workspaceId ?? undefined,
              },
              {
                action: "api_key.created",
                resource: "api_key",
                resourceId: apiKey.id,
                details: {
                  name,
                  mode,
                  organizationId,
                  workspaceId: workspaceId ?? null,
                },
              },
            );

            return {
              rawKey: raw,
              apiKeyId: apiKey.id,
              keyHint: hint,
            };
          },
        [
          GraphQLError,
          apiKeyTable,
          assertOrgPermission,
          billing,
          countWorkspaceKeys,
          DEFAULT_LIMITS,
          generateApiKey,
          isWithinLimit,
          logAuditEvent,
          publish,
          resolveKeyOrganization,
        ],
      ),

      revokeApiKey: EXPORTABLE(
        (
          GraphQLError,
          and,
          apiKeyTable,
          assertOrgPermission,
          eq,
          isNull,
          logAuditEvent,
          publish,
          workspaceTable,
        ) =>
          async function revokeApiKey(
            _source: unknown,
            args: { id: string },
            ctx: GraphQLContext,
          ) {
            const { observer, db } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            const [existing] = await db
              .select({
                userId: apiKeyTable.userId,
                organizationId: apiKeyTable.organizationId,
                workspaceId: apiKeyTable.workspaceId,
              })
              .from(apiKeyTable)
              .where(eq(apiKeyTable.id, args.id));

            const isOwner = existing?.userId === observer.id;

            // A key is revocable by its creator, or by an admin of the
            // workspace it belongs to (a team admin cleaning up a member's key)
            if (!existing || (!isOwner && !existing.organizationId)) {
              throw new GraphQLError("API key not found", {
                extensions: { code: "NOT_FOUND" },
              });
            }

            if (!isOwner && existing.organizationId) {
              await assertOrgPermission(
                observer,
                existing.organizationId,
                "admin",
              );
            }

            // If the key is workspace-resource-scoped, verify org-level editor
            // permission
            if (existing.workspaceId) {
              const [workspace] = await db
                .select({ organizationId: workspaceTable.organizationId })
                .from(workspaceTable)
                .where(eq(workspaceTable.id, existing.workspaceId));

              if (workspace) {
                await assertOrgPermission(
                  observer,
                  workspace.organizationId,
                  "admin",
                );
              }
            }

            const [updated] = await db
              .update(apiKeyTable)
              .set({
                revokedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
              .where(
                and(eq(apiKeyTable.id, args.id), isNull(apiKeyTable.revokedAt)),
              )
              .returning();

            if (updated) {
              // Publish event (best-effort, fire-and-forget)
              void publish({
                type: "synapse.api_key.revoked",
                source: "omni.synapse",
                organizationId: existing.organizationId ?? observer.id,
                subject: observer.id,
                data: { apiKeyId: args.id },
              });

              // Audit log (gated by audit_logs entitlement)
              void logAuditEvent(
                {
                  userId: observer.id,
                  userIdpId: observer.identityProviderId,
                },
                {
                  action: "api_key.revoked",
                  resource: "api_key",
                  resourceId: args.id,
                },
              );
            }

            return !!updated;
          },
        [
          GraphQLError,
          and,
          apiKeyTable,
          assertOrgPermission,
          eq,
          isNull,
          logAuditEvent,
          publish,
          workspaceTable,
        ],
      ),

      linkProviderKey: EXPORTABLE(
        (
          GraphQLError,
          and,
          apiKeyProviderTable,
          apiKeyTable,
          assertOrgPermission,
          eq,
          isNull,
          providerKeyTable,
          workspaceTable,
        ) =>
          async function linkProviderKey(
            _source: unknown,
            args: { apiKeyId: string; providerKeyId: string },
            ctx: GraphQLContext,
          ) {
            const { observer, db } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            // Verify observer owns the API key and it is not revoked
            const [apiKey] = await db
              .select({
                id: apiKeyTable.id,
                workspaceId: apiKeyTable.workspaceId,
              })
              .from(apiKeyTable)
              .where(
                and(
                  eq(apiKeyTable.id, args.apiKeyId),
                  eq(apiKeyTable.userId, observer.id),
                  isNull(apiKeyTable.revokedAt),
                ),
              );

            if (!apiKey) {
              throw new GraphQLError("API key not found", {
                extensions: { code: "NOT_FOUND" },
              });
            }

            // If workspace-scoped, verify org-level editor permission
            if (apiKey.workspaceId) {
              const [workspace] = await db
                .select({ organizationId: workspaceTable.organizationId })
                .from(workspaceTable)
                .where(eq(workspaceTable.id, apiKey.workspaceId));

              if (workspace) {
                await assertOrgPermission(
                  observer,
                  workspace.organizationId,
                  "admin",
                );
              }
            }

            // Verify observer owns the provider key
            const [providerKey] = await db
              .select({ id: providerKeyTable.id })
              .from(providerKeyTable)
              .where(
                and(
                  eq(providerKeyTable.id, args.providerKeyId),
                  eq(providerKeyTable.userId, observer.id),
                ),
              );

            if (!providerKey) {
              throw new GraphQLError("Provider key not found", {
                extensions: { code: "NOT_FOUND" },
              });
            }

            const [inserted] = await db
              .insert(apiKeyProviderTable)
              .values({
                apiKeyId: args.apiKeyId,
                providerKeyId: args.providerKeyId,
              })
              .onConflictDoNothing()
              .returning();

            return !!inserted;
          },
        [
          GraphQLError,
          and,
          apiKeyProviderTable,
          apiKeyTable,
          assertOrgPermission,
          eq,
          isNull,
          providerKeyTable,
          workspaceTable,
        ],
      ),

      unlinkProviderKey: EXPORTABLE(
        (
          GraphQLError,
          and,
          apiKeyProviderTable,
          apiKeyTable,
          assertOrgPermission,
          eq,
          workspaceTable,
        ) =>
          async function unlinkProviderKey(
            _source: unknown,
            args: { apiKeyId: string; providerKeyId: string },
            ctx: GraphQLContext,
          ) {
            const { observer, db } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            // Verify observer owns the API key
            const [apiKey] = await db
              .select({
                id: apiKeyTable.id,
                workspaceId: apiKeyTable.workspaceId,
              })
              .from(apiKeyTable)
              .where(
                and(
                  eq(apiKeyTable.id, args.apiKeyId),
                  eq(apiKeyTable.userId, observer.id),
                ),
              );

            if (!apiKey) {
              throw new GraphQLError("API key not found", {
                extensions: { code: "NOT_FOUND" },
              });
            }

            // If workspace-scoped, verify org-level editor permission
            if (apiKey.workspaceId) {
              const [workspace] = await db
                .select({ organizationId: workspaceTable.organizationId })
                .from(workspaceTable)
                .where(eq(workspaceTable.id, apiKey.workspaceId));

              if (workspace) {
                await assertOrgPermission(
                  observer,
                  workspace.organizationId,
                  "admin",
                );
              }
            }

            const [deleted] = await db
              .delete(apiKeyProviderTable)
              .where(
                and(
                  eq(apiKeyProviderTable.apiKeyId, args.apiKeyId),
                  eq(apiKeyProviderTable.providerKeyId, args.providerKeyId),
                ),
              )
              .returning();

            return !!deleted;
          },
        [
          GraphQLError,
          and,
          apiKeyProviderTable,
          apiKeyTable,
          assertOrgPermission,
          eq,
          workspaceTable,
        ],
      ),
    },
  },
});

export default apiKeysPlugin;
