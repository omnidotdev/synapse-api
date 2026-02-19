import { and, eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { encrypt } from "lib/crypto";
import { providerKeyTable } from "lib/db/schema";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Provider key management mutations
 */
const providerKeysPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input SetProviderKeyInput {
      provider: String!
      key: String!
      modelPreference: String
    }

    extend type Mutation {
      """
      Encrypt and upsert a BYOK provider key.
      """
      setProviderKey(input: SetProviderKeyInput!): ProviderKey

      """
      Delete a provider key. Verifies ownership before deletion.
      """
      removeProviderKey(id: UUID!): Boolean
    }
  `,
  resolvers: {
    Mutation: {
      async setProviderKey(
        _source: unknown,
        args: { input: { provider: string; key: string; modelPreference?: string } },
        ctx: GraphQLContext,
      ) {
        const { observer, db } = ctx;

        if (!observer) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        const { provider, key, modelPreference } = args.input;
        const encryptedKey = encrypt(key);
        // Last 4 characters of the raw key as a hint
        const keyHint = key.slice(-4);

        const [providerKey] = await db
          .insert(providerKeyTable)
          .values({
            userId: observer.id,
            provider,
            encryptedKey,
            keyHint,
            modelPreference: modelPreference ?? null,
          })
          .onConflictDoUpdate({
            target: [providerKeyTable.userId, providerKeyTable.provider],
            set: {
              encryptedKey,
              keyHint,
              modelPreference: modelPreference ?? null,
              updatedAt: new Date().toISOString(),
            },
          })
          .returning();

        return providerKey;
      },

      async removeProviderKey(
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

        const [deleted] = await db
          .delete(providerKeyTable)
          .where(
            and(
              eq(providerKeyTable.id, args.id),
              eq(providerKeyTable.userId, observer.id),
            ),
          )
          .returning();

        return !!deleted;
      },
    },
  },
});

export default providerKeysPlugin;
