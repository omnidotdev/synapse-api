import { and, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import { decrypt, hashApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import {
  apiKeyProviderTable,
  apiKeyTable,
  providerKeyTable,
  userTable,
} from "lib/db/schema";
import { billing } from "lib/providers";
import { isVaultEnabled, resolveVaultKeys } from "lib/vault/client";

import type { PlanTier } from "lib/config/plans.config";

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
      if (isVaultEnabled()) {
        // Resolve BYOK keys from Gatekeeper vault
        const providers = [
          "anthropic",
          "openai",
          "google",
          "groq",
          "mistral",
          "openrouter",
        ];
        const vaultKeys = await resolveVaultKeys(
          user.identityProviderId,
          providers,
        );

        providerKeys = vaultKeys.map((k) => ({
          provider: k.provider,
          decryptedKey: k.key,
        }));
      } else {
        // Fall back to local DB decryption
        const keys = await dbPool
          .select()
          .from(providerKeyTable)
          .where(eq(providerKeyTable.userId, apiKey.userId));

        providerKeys = keys.map((k) => ({
          provider: k.provider,
          decryptedKey: decrypt(k.encryptedKey),
        }));
      }
    }

    // Check per-key provider associations (works for any mode)
    const linkedProviderKeys = await dbPool
      .select({
        provider: providerKeyTable.provider,
        encryptedKey: providerKeyTable.encryptedKey,
      })
      .from(apiKeyProviderTable)
      .innerJoin(
        providerKeyTable,
        eq(apiKeyProviderTable.providerKeyId, providerKeyTable.id),
      )
      .where(eq(apiKeyProviderTable.apiKeyId, apiKey.id));

    if (linkedProviderKeys.length > 0) {
      // Per-key links take precedence over account-level BYOK keys
      providerKeys = linkedProviderKeys.map((pk) => ({
        provider: pk.provider,
        decryptedKey: decrypt(pk.encryptedKey),
      }));
    }

    // Resolve plan: trust DB if already upgraded, otherwise check Aether
    // to catch cases where webhook hasn't synced yet
    let plan = (user.plan ?? "free") as PlanTier;

    if (plan === "free") {
      const entitlements = await billing
        .getEntitlements("user", user.identityProviderId, "synapse")
        .catch(() => null);

      const tierEntitlement = entitlements?.entitlements?.find(
        (e) => e.featureKey === "tier",
      );

      if (
        tierEntitlement?.value &&
        ["pro", "team"].includes(String(tierEntitlement.value))
      ) {
        plan = String(tierEntitlement.value) as PlanTier;

        // Backfill the DB so future lookups are fast
        dbPool
          .update(userTable)
          .set({ plan, updatedAt: new Date().toISOString() })
          .where(eq(userTable.id, user.id))
          .execute()
          .catch(() => {});
      }
    }

    // Enforce byok_enabled entitlement
    if (apiKey.mode === "byok") {
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
    }

    const rateLimits = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;

    return {
      userId: user.identityProviderId,
      workspaceId: apiKey.workspaceId,
      apiKeyId: apiKey.id,
      mode: apiKey.mode,
      plan,
      rateLimits,
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
