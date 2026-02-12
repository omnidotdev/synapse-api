import { and, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { decrypt, hashApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, providerKeyTable, userTable } from "lib/db/schema";

/**
 * Internal endpoint for gateway API key resolution
 */
const resolveKeyRoute = new Elysia().post(
  "/internal/resolve-key",
  async ({ body, headers, set }) => {
    const secret = headers["x-gateway-secret"];

    if (!GATEWAY_SECRET || secret !== GATEWAY_SECRET) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const keyHash = hashApiKey(body.key);

    const [apiKey] = await dbPool
      .select()
      .from(apiKeyTable)
      .where(
        and(eq(apiKeyTable.keyHash, keyHash), isNull(apiKeyTable.revokedAt)),
      )
      .limit(1);

    if (!apiKey) {
      set.status = 404;
      return { error: "invalid_key" };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      set.status = 404;
      return { error: "expired_key" };
    }

    // Update last_used_at (fire-and-forget)
    const now = new Date().toISOString();

    dbPool
      .update(apiKeyTable)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(eq(apiKeyTable.id, apiKey.id))
      .execute()
      .catch(() => {});

    const [user] = await dbPool
      .select()
      .from(userTable)
      .where(eq(userTable.id, apiKey.userId))
      .limit(1);

    if (!user) {
      set.status = 404;
      return { error: "user_not_found" };
    }

    let providerKeys: { provider: string; decryptedKey: string }[] = [];

    if (apiKey.mode === "byok") {
      const keys = await dbPool
        .select()
        .from(providerKeyTable)
        .where(eq(providerKeyTable.userId, apiKey.userId));

      providerKeys = keys.map((k) => ({
        provider: k.provider,
        decryptedKey: decrypt(k.encryptedKey),
      }));
    }

    return {
      userId: user.id,
      workspaceId: apiKey.workspaceId,
      apiKeyId: apiKey.id,
      mode: apiKey.mode,
      providerKeys,
    };
  },
  {
    body: t.Object({
      key: t.String(),
    }),
  },
);

export default resolveKeyRoute;
