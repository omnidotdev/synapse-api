import { and, eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { encrypt } from "lib/crypto";
import { providerKeyTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { events } from "lib/providers";
import {
  isVaultEnabled,
  listVaultKeys,
  providerToUUID,
  removeVaultKey,
  setVaultKey,
} from "lib/vault/client";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Extract the bearer token from the request Authorization header
 */
const extractAccessToken = (request: Request): string | undefined =>
  request.headers.get("authorization")?.split("Bearer ")[1];

/**
 * Provider key management queries and mutations
 */
const providerKeysPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input SetProviderKeyInput {
      provider: String!
      key: String!
      modelPreference: String
    }

    extend type Observer {
      """
      List provider keys for the current user.
      """
      providerKeys: [ProviderKey!]!
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
    Observer: {
      async providerKeys(
        observer: { id: string },
        _args: Record<string, never>,
        ctx: GraphQLContext,
      ) {
        if (isVaultEnabled()) {
          const accessToken = extractAccessToken(ctx.request);
          if (!accessToken) return [];

          const vaultKeys = await listVaultKeys(accessToken);

          return vaultKeys.map((vk) => ({
            id: providerToUUID(vk.provider),
            userId: observer.id,
            provider: vk.provider,
            // Vault stores encrypted keys server-side; expose only the hint
            encryptedKey: "",
            keyHint: vk.key_hint ?? "",
            modelPreference: vk.model_override ?? null,
            createdAt: vk.created_at,
            updatedAt: vk.updated_at,
          }));
        }

        const { db } = ctx;

        return db
          .select()
          .from(providerKeyTable)
          .where(eq(providerKeyTable.userId, observer.id));
      },
    },
    Mutation: {
      async setProviderKey(
        _source: unknown,
        args: {
          input: { provider: string; key: string; modelPreference?: string };
        },
        ctx: GraphQLContext,
      ) {
        const { observer } = ctx;

        if (!observer) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        const { provider, key, modelPreference } = args.input;

        if (isVaultEnabled()) {
          const accessToken = extractAccessToken(ctx.request);
          if (!accessToken) {
            throw new GraphQLError(
              "Access token required for vault operations",
              {
                extensions: { code: "UNAUTHENTICATED" },
              },
            );
          }

          const result = await setVaultKey(accessToken, {
            provider,
            key,
            modelPreference,
          });

          if (!result.success) {
            throw new GraphQLError(
              result.error ?? "Failed to store key in vault",
              { extensions: { code: "VAULT_ERROR" } },
            );
          }

          const now = new Date().toISOString();
          const syntheticKey = {
            id: providerToUUID(provider),
            userId: observer.id,
            provider,
            encryptedKey: "",
            keyHint: key.slice(-4),
            modelPreference: modelPreference ?? null,
            createdAt: now,
            updatedAt: now,
          };

          // Publish event (best-effort, fire-and-forget)
          void publish({
            type: "synapse.provider_key.upserted",
            source: "synapse-api",
            organizationId: observer.id,
            subject: observer.id,
            data: { providerKeyId: syntheticKey.id, provider },
          });
          void events.emit({
            type: "synapse.provider_key.upserted",
            data: { providerKeyId: syntheticKey.id, provider },
            organizationId: observer.id,
            subject: observer.id,
          });

          return syntheticKey;
        }

        const { db } = ctx;
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

        // Publish event (best-effort, fire-and-forget)
        void publish({
          type: "synapse.provider_key.upserted",
          source: "synapse-api",
          organizationId: observer.id,
          subject: observer.id,
          data: { providerKeyId: providerKey.id, provider },
        });
        void events.emit({
          type: "synapse.provider_key.upserted",
          data: { providerKeyId: providerKey.id, provider },
          organizationId: observer.id,
          subject: observer.id,
        });

        return providerKey;
      },

      async removeProviderKey(
        _source: unknown,
        args: { id: string },
        ctx: GraphQLContext,
      ) {
        const { observer } = ctx;

        if (!observer) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        if (isVaultEnabled()) {
          const accessToken = extractAccessToken(ctx.request);
          if (!accessToken) {
            throw new GraphQLError(
              "Access token required for vault operations",
              {
                extensions: { code: "UNAUTHENTICATED" },
              },
            );
          }

          // Resolve the provider name from the deterministic UUID
          const vaultKeys = await listVaultKeys(accessToken);
          const target = vaultKeys.find(
            (vk) => providerToUUID(vk.provider) === args.id,
          );

          if (!target) return false;

          const deleted = await removeVaultKey(accessToken, target.provider);

          if (deleted) {
            // Publish event (best-effort, fire-and-forget)
            void publish({
              type: "synapse.provider_key.deleted",
              source: "synapse-api",
              organizationId: observer.id,
              subject: observer.id,
              data: { providerKeyId: args.id },
            });
            void events.emit({
              type: "synapse.provider_key.deleted",
              data: { providerKeyId: args.id },
              organizationId: observer.id,
              subject: observer.id,
            });
          }

          return deleted;
        }

        const { db } = ctx;

        const [deleted] = await db
          .delete(providerKeyTable)
          .where(
            and(
              eq(providerKeyTable.id, args.id),
              eq(providerKeyTable.userId, observer.id),
            ),
          )
          .returning();

        if (deleted) {
          // Publish event (best-effort, fire-and-forget)
          void publish({
            type: "synapse.provider_key.deleted",
            source: "synapse-api",
            organizationId: observer.id,
            subject: observer.id,
            data: { providerKeyId: args.id },
          });
          void events.emit({
            type: "synapse.provider_key.deleted",
            data: { providerKeyId: args.id },
            organizationId: observer.id,
            subject: observer.id,
          });
        }

        return !!deleted;
      },
    },
  },
});

export default providerKeysPlugin;
