import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { decrypt } from "lib/crypto";
import { dbPool } from "lib/db";
import {
  providerKeyTable,
  userPreferenceTable,
  userTable,
} from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { isVaultEnabled, resolveVaultKeys } from "lib/vault/client";

/**
 * Internal endpoint for resolving a user's BYOK provider keys by identity provider ID.
 * Called by beacon-gateway and other gateways at LLM routing time.
 */
const resolveProviderKeysRoute = new Elysia().post(
  "/internal/resolve-provider-keys",
  async ({ body, headers, set }) => {
    const secret = headers["x-gateway-secret"];

    if (!GATEWAY_SECRET || secret !== GATEWAY_SECRET) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const [user] = await dbPool
      .select()
      .from(userTable)
      .where(eq(userTable.identityProviderId, body.identityProviderId))
      .limit(1);

    if (!user) {
      return { providerKeys: [], defaultProvider: null };
    }

    let providerKeys: {
      provider: string;
      decryptedKey: string;
      modelPreference: string | null;
    }[];

    if (isVaultEnabled()) {
      // Resolve BYOK keys from Gatekeeper vault
      const providers = ["anthropic", "openai", "openrouter"];
      const vaultKeys = await resolveVaultKeys(
        body.identityProviderId,
        providers,
      );

      providerKeys = vaultKeys.map((k) => ({
        provider: k.provider,
        decryptedKey: k.key,
        modelPreference: k.model_override ?? null,
      }));
    } else {
      // Fall back to local DB decryption
      const keys = await dbPool
        .select()
        .from(providerKeyTable)
        .where(eq(providerKeyTable.userId, user.id));

      try {
        providerKeys = keys.map((k) => ({
          provider: k.provider,
          decryptedKey: decrypt(k.encryptedKey),
          modelPreference: k.modelPreference ?? null,
        }));
      } catch (e) {
        console.error("key decryption failed", e);

        publish({
          type: "synapse.provider.error",
          source: "synapse-api",
          organizationId: body.identityProviderId,
          subject: body.identityProviderId,
          data: {
            userId: body.identityProviderId,
            errorCode: "key_decryption_failed",
            message: e instanceof Error ? e.message : String(e),
          },
        }).catch(() => {});

        set.status = 500;
        return { error: "key_decryption_failed" };
      }
    }

    // Fetch default provider preference (needed for both vault and local paths)
    const prefsRows = await dbPool
      .select({ defaultProvider: userPreferenceTable.defaultProvider })
      .from(userPreferenceTable)
      .where(eq(userPreferenceTable.userId, user.id))
      .limit(1);

    return {
      providerKeys,
      defaultProvider: prefsRows[0]?.defaultProvider ?? null,
    };
  },
  {
    body: t.Object({
      identityProviderId: t.String(),
    }),
  },
);

export default resolveProviderKeysRoute;
