import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { aetherAccess } from "lib/billing/apiAccess";
import { parseProductScope } from "lib/billing/productScope";
import { GATEWAY_SECRET } from "lib/config/env.config";
import { constantTimeEqual, generateApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";

import type { ProductScope } from "lib/billing/productScope";
import type { PlanTier } from "lib/config/plans.config";

const DEFAULT_KEY_SOURCE = "Managed";

/**
 * How long a rotated-out key keeps resolving. Every caller replica provisions
 * and caches its own key, so without a window one replica's rotation would
 * invalidate the key another replica just cached
 */
const ROTATION_GRACE_MS = 10 * 60_000;

/**
 * Rows of one managed-key tuple: (user, source name, product, billing entity).
 * A direct key carries no product or entity
 */
const managedKeyTuple = (
  userId: string,
  keyName: string,
  scope: ProductScope | null,
) =>
  and(
    eq(apiKeyTable.userId, userId),
    eq(apiKeyTable.mode, "managed"),
    eq(apiKeyTable.name, keyName),
    scope
      ? and(
          eq(apiKeyTable.appId, scope.appId),
          eq(apiKeyTable.billingEntityType, scope.billingEntity.entityType),
          eq(apiKeyTable.billingEntityId, scope.billingEntity.entityId),
        )
      : and(
          isNull(apiKeyTable.appId),
          isNull(apiKeyTable.billingEntityType),
          isNull(apiKeyTable.billingEntityId),
        ),
    isNull(apiKeyTable.revokedAt),
  );

/**
 * Mint a new current key for a tuple, rotating the previous current key into
 * its grace window and retiring keys whose window has lapsed. Provisions of
 * the same tuple serialize on a transaction-scoped advisory lock, so
 * concurrent callers each rotate in turn instead of racing the tuple's
 * partial unique index
 */
const rotateManagedKey = (
  userId: string,
  keyName: string,
  scope: ProductScope | null,
  key: { hash: string; hint: string },
) =>
  dbPool.transaction(async (tx) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const tuple = managedKeyTuple(userId, keyName, scope);

    const lockKey = JSON.stringify([
      userId,
      keyName,
      scope?.appId ?? null,
      scope?.billingEntity.entityType ?? null,
      scope?.billingEntity.entityId ?? null,
    ]);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    // Retire keys whose grace window has lapsed
    await tx
      .update(apiKeyTable)
      .set({ revokedAt: nowIso, updatedAt: nowIso })
      .where(
        and(
          tuple,
          isNotNull(apiKeyTable.expiresAt),
          lte(apiKeyTable.expiresAt, nowIso),
        ),
      );

    const [current] = await tx
      .select({ id: apiKeyTable.id })
      .from(apiKeyTable)
      .where(and(tuple, isNull(apiKeyTable.expiresAt)))
      .limit(1);

    if (current) {
      await tx
        .update(apiKeyTable)
        .set({
          expiresAt: new Date(now.getTime() + ROTATION_GRACE_MS).toISOString(),
          updatedAt: nowIso,
        })
        .where(eq(apiKeyTable.id, current.id));
    }

    await tx.insert(apiKeyTable).values({
      userId,
      keyHash: key.hash,
      keyHint: key.hint,
      name: keyName,
      mode: "managed",
      ...(scope
        ? {
            appId: scope.appId,
            billingEntityType: scope.billingEntity.entityType,
            billingEntityId: scope.billingEntity.entityId,
          }
        : {}),
    });
  });

/** `identityProviderId` is a uuid() column, so reject non-UUIDs at the boundary. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Internal endpoint for auto-provisioning a managed API key
 *
 * Called by beacon-gateway when a cloud user chats without a BYOK key, and by
 * other Omni products (with `appId`) to give an end user managed access that
 * the gateway meters and charges under that product.
 * Upserts the user, then creates or rotates a managed key. Keys are per
 * (user, source, product, billing entity): a user in two organizations holds
 * independent keys, and re-provisioning the same tuple rotates its key while
 * the previous one keeps resolving for a short grace window.
 */
const provisionKeyRoute = new Elysia().post(
  "/internal/provision-managed-key",
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

    // identityProviderId maps to a uuid() column; validate at the boundary so a
    // bad value returns a clean 400 instead of leaking a raw DB error
    if (!UUID_RE.test(body.identityProviderId)) {
      set.status = 400;
      return { error: "identityProviderId must be a UUID" };
    }

    // A product provisioning per-end-user access names its Aether app (and
    // optionally the entity to bill); validate before anything is written
    const parsedScope = parseProductScope({
      appId: body.appId,
      billingEntity: body.billingEntity,
      identityProviderId: body.identityProviderId,
    });

    if (!parsedScope.ok) {
      set.status = 400;
      return { error: parsedScope.error };
    }

    const scope = parsedScope.scope;

    // Upsert user via identityProviderId (same pattern as auth plugin)
    const insertedUser = {
      identityProviderId: body.identityProviderId,
      ...(body.email && { email: body.email }),
      ...(body.name && { name: body.name }),
    };

    const { identityProviderId, ...rest } = insertedUser;

    let user: typeof userTable.$inferSelect | undefined;
    try {
      [user] = await dbPool
        .insert(userTable)
        .values(insertedUser)
        .onConflictDoUpdate({
          target: userTable.identityProviderId,
          set: {
            ...rest,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();
    } catch (err) {
      // Never leak a raw DB error to the caller; log server-side only
      console.error(
        `[provision-managed-key] user upsert failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      );
    }

    if (!user) {
      set.status = 500;
      return { error: "provisioning failed" };
    }

    // Check api_access before minting, against the product and entity the key
    // will bill (or Synapse itself for a direct key). Aether's check is
    // value-aware and provisions a brand-new entity's free tier (entitlements
    // plus the free credit grant), so the account exists before the key does.
    // Deny only on Aether's answer; when billing is unavailable, provision and
    // let the gateway enforce on each request
    const access = await (scope
      ? aetherAccess.checkApiAccess(
          scope.appId,
          scope.billingEntity.entityType,
          scope.billingEntity.entityId,
        )
      : aetherAccess.checkApiAccess(
          "synapse",
          "user",
          user.identityProviderId ?? user.id,
        ));

    if (access === "denied") {
      set.status = 403;
      return { error: "api_access entitlement denied" };
    }

    const keyName = `${body.source || DEFAULT_KEY_SOURCE} (auto)`;

    // Generate a fresh API key
    const { raw, hash, hint } = generateApiKey();

    try {
      await rotateManagedKey(user.id, keyName, scope, { hash, hint });
    } catch (err) {
      console.error(
        `[provision-managed-key] key upsert failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      );
      set.status = 500;
      return { error: "provisioning failed" };
    }

    const plan = (user.plan ?? "free") as PlanTier;

    return {
      apiKey: raw,
      keyHint: hint,
      userId: user.id,
      plan,
    };
  },
  {
    body: t.Object({
      identityProviderId: t.String(),
      email: t.Optional(t.String()),
      name: t.Optional(t.String()),
      source: t.Optional(t.String()),
      /** Aether app the key bills (another Omni product); omit for a direct key */
      appId: t.Optional(t.String()),
      /** Entity to bill within the product; defaults to the provisioned user */
      billingEntity: t.Optional(
        t.Object({ entityType: t.String(), entityId: t.String() }),
      ),
    }),
  },
);

export default provisionKeyRoute;
