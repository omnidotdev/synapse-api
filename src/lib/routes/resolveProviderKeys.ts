import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { constantTimeEqual, decrypt } from "lib/crypto";
import { dbPool } from "lib/db";
import {
  providerKeyTable,
  userPreferenceTable,
  userTable,
} from "lib/db/schema";
import { billing } from "lib/providers";
import { isVaultEnabled, resolveVaultKeys } from "lib/vault/client";

/**
 * Internal endpoint for resolving a user's BYOK provider keys by identity provider ID.
 * Called by beacon-gateway and other gateways at LLM routing time.
 */
const resolveProviderKeysRoute = new Elysia().post(
  "/internal/resolve-provider-keys",
  async ({ body, headers, set }) => {
    const secret = headers["x-gateway-secret"];

    if (
      !GATEWAY_SECRET ||
      !secret ||
      !constantTimeEqual(secret, GATEWAY_SECRET)
    ) {
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

    // Check byok_enabled entitlement before decrypting keys
    const entitlements = await billing
      .getEntitlements("user", user.identityProviderId, "synapse")
      .catch(() => null);

    const byokEntitlement = entitlements?.entitlements?.find(
      (e) => e.featureKey === "byok_enabled",
    );

    if (byokEntitlement && Number(byokEntitlement.value) === 0) {
      set.status = 403;
      return { error: "byok_not_enabled" };
    }

    let providerKeys: {
      provider: string;
      decryptedKey: string;
      modelPreference: string | null;
    }[];

    if (isVaultEnabled()) {
      // Resolve BYOK keys from Gatekeeper vault
      const providers = ["anthropic", "openai", "google", "groq", "mistral"];
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

      providerKeys = keys.flatMap((k) => {
        try {
          return [
            {
              provider: k.provider,
              decryptedKey: decrypt(k.encryptedKey),
              modelPreference: k.modelPreference ?? null,
            },
          ];
        } catch {
          console.warn(
            `failed to decrypt provider key for ${k.provider}, skipping`,
          );
          return [];
        }
      });
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
