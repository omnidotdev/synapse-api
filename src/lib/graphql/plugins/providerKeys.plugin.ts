import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, eq } from "drizzle-orm";
import { EXPORTABLE } from "graphile-export";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { encrypt } from "lib/crypto";
import { providerKeyTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { billing, events } from "lib/providers";
import {
  isVaultEnabled,
  listVaultKeys,
  providerToUUID,
  removeVaultKey,
  setVaultKey,
} from "lib/vault/client";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

// Fallback limits when Aether is unreachable
const DEFAULT_LIMITS = {
  max_provider_keys: { free: 6, pro: 10, team: -1 },
};

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
    }

    type ProviderKeyInfo {
      id: UUID!
      userId: UUID!
      provider: String!
      keyHint: String!
      createdAt: Datetime
      updatedAt: Datetime
      modelPreference: String
    }

    extend type Observer {
      """
      List provider keys for the current user.
      """
      providerKeys: [ProviderKeyInfo!]!
    }

    extend type Mutation {
      """
      Encrypt and upsert a BYOK provider key.
      """
      setProviderKey(input: SetProviderKeyInput!): ProviderKeyInfo

      """
      Delete a provider key. Verifies ownership before deletion.
      """
      removeProviderKey(id: UUID!): Boolean
    }
  `,
  resolvers: {
    Observer: {
      providerKeys: EXPORTABLE(
        (
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          providerToUUID,
          providerKeyTable,
          eq,
        ) =>
          async function providerKeys(
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

            const rows = await db
              .select()
              .from(providerKeyTable)
              .where(eq(providerKeyTable.userId, observer.id));

            return rows.map((row) => ({ ...row, encryptedKey: "" }));
          },
        [
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          providerToUUID,
          providerKeyTable,
          eq,
        ],
      ),
    },
    Mutation: {
      setProviderKey: EXPORTABLE(
        (
          GraphQLError,
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          billing,
          isWithinLimit,
          DEFAULT_LIMITS,
          setVaultKey,
          providerToUUID,
          publish,
          events,
          providerKeyTable,
          encrypt,
          and,
          eq,
        ) =>
          async function setProviderKey(
            _source: unknown,
            args: {
              input: { provider: string; key: string };
            },
            ctx: GraphQLContext,
          ) {
            const { observer } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            const { provider, key } = args.input;

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

              // Enforce max_provider_keys entitlement (skip for updates)
              const vaultKeys = await listVaultKeys(accessToken);
              const isUpdate = vaultKeys.some((vk) => vk.provider === provider);

              if (!isUpdate) {
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
                    "max_provider_keys",
                    vaultKeys.length,
                    DEFAULT_LIMITS,
                  )
                ) {
                  throw new GraphQLError(
                    "Provider key limit reached. Upgrade your plan for more keys",
                    { extensions: { code: "QUOTA_EXCEEDED" } },
                  );
                }
              }

              const result = await setVaultKey(accessToken, {
                provider,
                key,
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
                modelPreference: null,
                createdAt: now,
                updatedAt: now,
              };

              // Publish event (best-effort, fire-and-forget)
              void publish({
                type: "synapse.provider_key.upserted",
                source: "omni.synapse",
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

            // Fetch entitlements before the transaction (external call)
            const entitlements = await billing
              .getEntitlements(
                "user",
                observer.identityProviderId ?? observer.id,
                "synapse",
              )
              .catch(() => null);

            const encryptedKey = encrypt(key);
            // Last 4 characters of the raw key as a hint
            const keyHint = key.slice(-4);

            // Wrap count check + insert in a transaction to prevent TOCTOU races
            const providerKey = await db.transaction(async (tx) => {
              // Enforce max_provider_keys entitlement (skip for updates)
              const existingKeys = await tx
                .select({ id: providerKeyTable.id })
                .from(providerKeyTable)
                .where(eq(providerKeyTable.userId, observer.id));

              const isUpdate = await tx
                .select({ id: providerKeyTable.id })
                .from(providerKeyTable)
                .where(
                  and(
                    eq(providerKeyTable.userId, observer.id),
                    eq(providerKeyTable.provider, provider),
                  ),
                );

              if (isUpdate.length === 0) {
                if (
                  !isWithinLimit(
                    entitlements,
                    "max_provider_keys",
                    existingKeys.length,
                    DEFAULT_LIMITS,
                  )
                ) {
                  throw new GraphQLError(
                    "Provider key limit reached. Upgrade your plan for more keys",
                    { extensions: { code: "QUOTA_EXCEEDED" } },
                  );
                }
              }

              const [inserted] = await tx
                .insert(providerKeyTable)
                .values({
                  userId: observer.id,
                  provider,
                  encryptedKey,
                  keyHint,
                })
                .onConflictDoUpdate({
                  target: [providerKeyTable.userId, providerKeyTable.provider],
                  set: {
                    encryptedKey,
                    keyHint,
                    updatedAt: new Date().toISOString(),
                  },
                })
                .returning();

              return inserted;
            });

            // Publish event (best-effort, fire-and-forget)
            void publish({
              type: "synapse.provider_key.upserted",
              source: "omni.synapse",
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
        [
          GraphQLError,
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          billing,
          isWithinLimit,
          DEFAULT_LIMITS,
          setVaultKey,
          providerToUUID,
          publish,
          events,
          providerKeyTable,
          encrypt,
          and,
          eq,
        ],
      ),

      removeProviderKey: EXPORTABLE(
        (
          GraphQLError,
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          providerToUUID,
          removeVaultKey,
          publish,
          events,
          providerKeyTable,
          and,
          eq,
        ) =>
          async function removeProviderKey(
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

              const deleted = await removeVaultKey(
                accessToken,
                target.provider,
              );

              if (deleted) {
                // Publish event (best-effort, fire-and-forget)
                void publish({
                  type: "synapse.provider_key.deleted",
                  source: "omni.synapse",
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
                source: "omni.synapse",
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
        [
          GraphQLError,
          isVaultEnabled,
          extractAccessToken,
          listVaultKeys,
          providerToUUID,
          removeVaultKey,
          publish,
          events,
          providerKeyTable,
          and,
          eq,
        ],
      ),
    },
  },
});

export default providerKeysPlugin;
