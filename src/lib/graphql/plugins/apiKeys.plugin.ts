import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import {
  apiKeyProviderTable,
  apiKeyTable,
  providerKeyTable,
  workspaceTable,
} from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { authz, billing } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

// Fallback limits when Aether is unreachable
const DEFAULT_LIMITS = {
  max_api_keys: { free: 3, pro: 25, team: -1 },
};

/**
 * Assert the observer has a specific permission on an organization via Warden.
 * No-ops if Warden is not configured.
 */
const assertOrgPermission = async (
  userId: string,
  organizationId: string,
  action: string,
) => {
  if (!authz) return;

  const allowed = await authz.checkPermission(
    userId,
    "organization",
    organizationId,
    action,
  );

  if (!allowed) {
    throw new GraphQLError(`Insufficient permissions: requires ${action}`, {
      extensions: { code: "FORBIDDEN" },
    });
  }
};

/**
 * API key management queries and mutations
 */
const apiKeysPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input GenerateApiKeyInput {
      name: String!
      mode: String!
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
      List active API keys for the current user, optionally filtered by workspace.
      """
      apiKeys(workspaceId: UUID): [ApiKeyInfo!]!
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
      async linkedProviders(
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
    },
    Observer: {
      async apiKeys(
        observer: { id: string },
        args: { workspaceId?: string },
        ctx: GraphQLContext,
      ) {
        const { db } = ctx;

        // If workspace-scoped, verify org-level viewer permission
        if (args.workspaceId) {
          const [workspace] = await db
            .select({ organizationId: workspaceTable.organizationId })
            .from(workspaceTable)
            .where(eq(workspaceTable.id, args.workspaceId));

          if (workspace) {
            await assertOrgPermission(
              observer.id,
              workspace.organizationId,
              "viewer",
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
    },
    Mutation: {
      async generateApiKey(
        _source: unknown,
        args: { input: { name: string; mode: string; workspaceId?: string } },
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

        // If workspace-scoped, verify org-level editor permission
        if (workspaceId) {
          const [workspace] = await db
            .select({ organizationId: workspaceTable.organizationId })
            .from(workspaceTable)
            .where(eq(workspaceTable.id, workspaceId));

          if (!workspace) {
            throw new GraphQLError("Workspace not found", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          await assertOrgPermission(
            observer.id,
            workspace.organizationId,
            "editor",
          );
        }

        // Only "byok" is allowed via user-facing mutations; "managed"
        // keys are system-provisioned via internal routes
        if (mode !== "byok") {
          throw new GraphQLError('Invalid key mode. Only "byok" is allowed', {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Fetch entitlements before the transaction (external call)
        const entitlements = await billing
          .getEntitlements(
            "user",
            observer.identityProviderId ?? observer.id,
            "synapse",
          )
          .catch(() => null);

        const { raw, hash, hint } = generateApiKey();

        // Wrap count check + insert in a transaction to prevent TOCTOU races
        const apiKey = await db.transaction(async (tx) => {
          // Enforce max_api_keys entitlement (managed keys are excluded,
          // they are system-provisioned by other Omni apps and should not
          // consume the user's quota)
          const activeKeys = await tx
            .select({ id: apiKeyTable.id })
            .from(apiKeyTable)
            .where(
              and(
                eq(apiKeyTable.userId, observer.id),
                isNull(apiKeyTable.revokedAt),
                ne(apiKeyTable.mode, "managed"),
              ),
            );

          if (
            !isWithinLimit(
              entitlements,
              "max_api_keys",
              activeKeys.length,
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
          organizationId: observer.id,
          subject: observer.id,
          data: {
            apiKeyId: apiKey.id,
            name,
            mode,
            workspaceId: workspaceId ?? null,
          },
        });

        return {
          rawKey: raw,
          apiKeyId: apiKey.id,
          keyHint: hint,
        };
      },

      async revokeApiKey(
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

        // If the key is workspace-scoped, verify org-level editor permission
        const [existing] = await db
          .select({ workspaceId: apiKeyTable.workspaceId })
          .from(apiKeyTable)
          .where(
            and(
              eq(apiKeyTable.id, args.id),
              eq(apiKeyTable.userId, observer.id),
            ),
          );

        if (!existing) {
          throw new GraphQLError("API key not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (existing.workspaceId) {
          const [workspace] = await db
            .select({ organizationId: workspaceTable.organizationId })
            .from(workspaceTable)
            .where(eq(workspaceTable.id, existing.workspaceId));

          if (workspace) {
            await assertOrgPermission(
              observer.id,
              workspace.organizationId,
              "editor",
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
            and(
              eq(apiKeyTable.id, args.id),
              eq(apiKeyTable.userId, observer.id),
              isNull(apiKeyTable.revokedAt),
            ),
          )
          .returning();

        if (updated) {
          // Publish event (best-effort, fire-and-forget)
          void publish({
            type: "synapse.api_key.revoked",
            source: "omni.synapse",
            organizationId: observer.id,
            subject: observer.id,
            data: { apiKeyId: args.id },
          });
        }

        return !!updated;
      },

      async linkProviderKey(
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
              observer.id,
              workspace.organizationId,
              "editor",
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

      async unlinkProviderKey(
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
              observer.id,
              workspace.organizationId,
              "editor",
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
    },
  },
});

export default apiKeysPlugin;
