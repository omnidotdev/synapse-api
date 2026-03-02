import { and, desc, eq, isNull } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

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

    extend type Observer {
      """
      List active API keys for the current user, optionally filtered by workspace.
      """
      apiKeys(workspaceId: UUID): [ApiKey!]!
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
