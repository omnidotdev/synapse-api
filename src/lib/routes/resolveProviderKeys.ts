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

    const [keys, prefsRows] = await Promise.all([
      dbPool
        .select()
        .from(providerKeyTable)
        .where(eq(providerKeyTable.userId, user.id)),
      dbPool
        .select({ defaultProvider: userPreferenceTable.defaultProvider })
        .from(userPreferenceTable)
        .where(eq(userPreferenceTable.userId, user.id))
        .limit(1),
    ]);

    let providerKeys: {
      provider: string;
      decryptedKey: string;
      modelPreference: string | null;
    }[];

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
          providerId: body.identityProviderId,
          errorCode: String((e as { status?: unknown }).status ?? "key_decryption_failed"),
          message: e instanceof Error ? e.message : String(e),
        },
      }).catch(() => {});

      set.status = 500;
      return { error: "key_decryption_failed" };
    }

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
