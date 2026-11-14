import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { storedProductScope } from "lib/billing/productScope";
import { GATEWAY_SECRET } from "lib/config/env.config";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import {
  PLAN_REQUEST_LIMITS,
  REQUEST_LIMITS_FALLBACK,
  REQUEST_OVERAGE_RATE_KEY,
} from "lib/config/requestLimits.config";
import { constantTimeEqual, decrypt, hashApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import {
  apiKeyProviderTable,
  apiKeyTable,
  providerKeyTable,
  usageEventTable,
  userTable,
} from "lib/db/schema";
import { billing } from "lib/providers";
import { isVaultEnabled, resolveVaultKeys } from "lib/vault/client";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";
import type { ProductScope } from "lib/billing/productScope";
import type { PlanTier } from "lib/config/plans.config";

/**
 * Enforce the direct-key `max_requests_per_month` quota (the core revenue
 * control). Returns the rejection body, or `null` when the request may proceed.
 *
 * Counts this user's requests for the current calendar month (one usage_event
 * row == one proxied request) and compares against the tier limit. A paid tier
 * that sells request overage (a positive REQUEST_OVERAGE_RATE_KEY rate) lets
 * requests through: the gateway still meters each one into Aether, which
 * invoices the requests above the allowance and enforces the spending limit.
 * Free has no payment method, so its quota is always a hard cap and the request
 * is rejected. The gateway caches resolve results for a short TTL and reports
 * usage asynchronously, so this check is approximate at TTL/flush granularity,
 * which is acceptable for a monthly quota
 */
const checkMonthlyRequestQuota = async (
  userId: string,
  entitlements: EntitlementsResponse | null,
  plan: PlanTier,
) => {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [monthlyUsage] = await dbPool
    .select({
      requestCount: sql<number>`count(*)::int`,
    })
    .from(usageEventTable)
    .where(
      and(
        eq(usageEventTable.userId, userId),
        gte(usageEventTable.createdAt, startOfMonth.toISOString()),
      ),
    );

  const monthlyRequests = monthlyUsage?.requestCount ?? 0;

  const withinRequestQuota = isWithinLimit(
    entitlements,
    "max_requests_per_month",
    monthlyRequests,
    REQUEST_LIMITS_FALLBACK,
  );

  if (withinRequestQuota) return null;

  // Resolve whether this tier sells billable request overage. Free never
  // does. Prefer the catalog rate Aether synced onto the account, falling back
  // to the SSOT-mirrored config when Aether has not supplied it
  if (plan !== "free") {
    const overageEntitlement = entitlements?.entitlements?.find(
      (e) => e.featureKey === REQUEST_OVERAGE_RATE_KEY,
    );
    const overageCentsPer1k =
      overageEntitlement?.value !== undefined
        ? Number(overageEntitlement.value)
        : (PLAN_REQUEST_LIMITS[plan] ?? PLAN_REQUEST_LIMITS.free)
            .overageCentsPer1k;

    if (overageCentsPer1k > 0) return null;
  }

  // Hard cap: reject the request with a clear over-limit response
  return {
    error: "monthly_request_limit_exceeded",
    limit: REQUEST_LIMITS_FALLBACK.max_requests_per_month[plan],
    current: monthlyRequests,
  };
};

/**
 * Internal endpoint for gateway API key resolution
 */
const resolveKeyRoute = new Elysia().post(
  "/internal/resolve-key",
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

    // A key provisioned by another Omni product bills that product's entity, so
    // its entitlements, tier, and quota come from the product, not the user's
    // own Synapse account
    let scope: ProductScope | null;
    try {
      scope = storedProductScope(apiKey);
    } catch (err) {
      console.error(
        `[resolve-key] ${err instanceof Error ? err.message : "invalid product scope"} (key ${apiKey.id})`,
      );
      set.status = 500;
      return { error: "key_misconfigured" };
    }

    // Fetch entitlements once for plan resolution and feature checks
    let plan = (user.plan ?? "free") as PlanTier;
    const entitlements = await (scope
      ? billing.getEntitlements(
          scope.billingEntity.entityType,
          scope.billingEntity.entityId,
          scope.appId,
        )
      : billing.getEntitlements("user", user.identityProviderId, "synapse")
    ).catch(() => null);

    // Reconcile the plan against the LIVE tier entitlement in BOTH directions.
    // Previously this only ran when plan === "free" (upgrade only), so a stale
    // "pro"/"team" left in user.plan after a cancel/downgrade was never
    // corrected on the hot path, leaving a churned customer on elevated
    // throttle limits and feature flags whenever the downgrade webhook was
    // missed. Aether is authoritative, so derive the plan from its tier
    // entitlement whenever aether is reachable; fall back to the persisted plan
    // only when the lookup failed (entitlements === null).
    if (entitlements) {
      const tierEntitlement = entitlements.entitlements?.find(
        (e) => e.featureKey === "tier",
      );
      const livePlan = (
        tierEntitlement?.value &&
        ["pro", "team"].includes(String(tierEntitlement.value))
          ? String(tierEntitlement.value)
          : "free"
      ) as PlanTier;

      if (livePlan !== plan) {
        plan = livePlan;
        // Backfill the DB so future lookups are fast and consistent. Only for
        // direct keys: user.plan is the user's Synapse tier, and a product's
        // tier must never overwrite it
        if (!scope) {
          dbPool
            .update(userTable)
            .set({ plan, updatedAt: new Date().toISOString() })
            .where(eq(userTable.id, user.id))
            .execute()
            .catch(() => {});
        }
      }
    }

    // Enforce byok_enabled entitlement before decrypting any keys
    if (apiKey.mode === "byok") {
      const byokEntitlement = entitlements?.entitlements?.find(
        (e) => e.featureKey === "byok_enabled",
      );

      if (byokEntitlement && Number(byokEntitlement.value) === 0) {
        set.status = 403;
        return { error: "byok_not_enabled" };
      }
    }

    // Enforce managed_keys_enabled entitlement for system-provisioned keys.
    // Managed keys are auto-provisioned by other Omni apps (e.g. Beacon) and
    // gated on the user's plan having managed-mode access.
    if (apiKey.mode === "managed") {
      const managedEntitlement = entitlements?.entitlements?.find(
        (e) => e.featureKey === "managed_keys_enabled",
      );

      if (managedEntitlement && Number(managedEntitlement.value) === 0) {
        set.status = 403;
        return { error: "managed_keys_not_enabled" };
      }
    }

    // A product-scoped key is metered by the gateway against the product's own
    // Aether meters; usage_event counts the user's direct Synapse traffic, so the
    // Synapse monthly quota below applies to direct keys only
    if (!scope) {
      const rejection = await checkMonthlyRequestQuota(
        apiKey.userId,
        entitlements,
        plan,
      );

      if (rejection) {
        set.status = 429;
        return rejection;
      }
    }

    let providerKeys: { provider: string; decryptedKey: string }[] = [];

    if (apiKey.mode === "byok") {
      if (isVaultEnabled()) {
        // Resolve BYOK keys from Gatekeeper vault
        const providers = ["anthropic", "openai", "google", "groq", "mistral"];
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

        providerKeys = keys.flatMap((k) => {
          try {
            return [
              { provider: k.provider, decryptedKey: decrypt(k.encryptedKey) },
            ];
          } catch {
            console.warn(
              `failed to decrypt provider key for ${k.provider}, skipping`,
            );
            return [];
          }
        });
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
      providerKeys = linkedProviderKeys.flatMap((pk) => {
        try {
          return [
            { provider: pk.provider, decryptedKey: decrypt(pk.encryptedKey) },
          ];
        } catch {
          console.warn(
            `failed to decrypt linked provider key for ${pk.provider}, skipping`,
          );
          return [];
        }
      });
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
      // The gateway bills usage, credits, and entitlements against this product
      // and entity; null for a direct key (gateway's own app, key owner)
      appId: scope?.appId ?? null,
      billingEntity: scope?.billingEntity ?? null,
    };
  },
  {
    body: t.Object({
      key: t.String(),
    }),
  },
);

export default resolveKeyRoute;
