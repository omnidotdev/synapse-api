import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable, workspaceTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { authz, billing } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

// Fallback limits when Aether is unreachable
const DEFAULT_LIMITS = {
  max_api_keys: { free: 1, pro: 25, team: -1 },
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

    type ApiKeyInfo {
      id: UUID!
      name: String!
      keyHint: String!
      mode: String!
      createdAt: Datetime!
      lastUsedAt: Datetime
      expiresAt: Datetime
      revokedAt: Datetime
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
    }
  `,
  resolvers: {
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

        // Enforce max_api_keys entitlement (managed keys are excluded —
        // they are system-provisioned by other Omni apps and should not
        // consume the user's quota)
        const activeKeys = await db
          .select({ id: apiKeyTable.id })
          .from(apiKeyTable)
          .where(
            and(
              eq(apiKeyTable.userId, observer.id),
              isNull(apiKeyTable.revokedAt),
              ne(apiKeyTable.mode, "managed"),
            ),
          );

        const entitlements = await billing
          .getEntitlements(
            "user",
            observer.identityProviderId ?? observer.id,
            "synapse",
          )
          .catch(() => null);

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

        const { raw, hash, hint } = generateApiKey();

        const [apiKey] = await db
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

        // Publish event (best-effort, fire-and-forget)
        void publish({
          type: "synapse.api_key.created",
          source: "synapse-api",
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
            source: "synapse-api",
            organizationId: observer.id,
            subject: observer.id,
            data: { apiKeyId: args.id },
          });
        }

        return !!updated;
      },
    },
  },
});

export default apiKeysPlugin;
