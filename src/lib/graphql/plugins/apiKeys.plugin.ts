import { and, eq, isNull } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * API key management mutations
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

        return !!updated;
      },
    },
  },
});

export default apiKeysPlugin;
