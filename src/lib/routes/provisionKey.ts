import { and, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { parseProductScope } from "lib/billing/productScope";
import { GATEWAY_SECRET } from "lib/config/env.config";
import { constantTimeEqual, generateApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";
import { billing } from "lib/providers";

import type { PlanTier } from "lib/config/plans.config";

const DEFAULT_KEY_SOURCE = "Managed";

/** `identityProviderId` is a uuid() column, so reject non-UUIDs at the boundary. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Internal endpoint for auto-provisioning a managed API key
 *
 * Called by beacon-gateway when a cloud user chats without a BYOK key, and by
 * other Omni products (with `appId`) to give an end user managed access that
 * the gateway meters and charges under that product.
 * Upserts the user, then creates or rotates a managed key.
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

    // Check api_access entitlement before provisioning, against the product the
    // key will bill (or Synapse itself for a direct key). If Aether returns
    // entitlements but api_access is explicitly revoked (value === "false"),
    // deny the request. Gracefully allow if Aether is unreachable or returns null.
    const entitlements = await (scope
      ? billing.getEntitlements(
          scope.billingEntity.entityType,
          scope.billingEntity.entityId,
          scope.appId,
        )
      : billing.getEntitlements(
          "user",
          user.identityProviderId ?? user.id,
          "synapse",
        )
    ).catch(() => null);

    const apiAccess = entitlements?.entitlements?.find(
      (e) => e.featureKey === "api_access",
    );

    if (apiAccess && apiAccess.value === "false") {
      set.status = 403;
      return { error: "api_access entitlement denied" };
    }

    const keyName = `${body.source || DEFAULT_KEY_SOURCE} (auto)`;

    // Generate a fresh API key
    const { raw, hash, hint } = generateApiKey();

    const scopeColumns = scope
      ? {
          appId: scope.appId,
          billingEntityType: scope.billingEntity.entityType,
          billingEntityId: scope.billingEntity.entityId,
        }
      : {};

    // Upsert managed key inside a transaction to prevent duplicates
    try {
      await dbPool.transaction(async (tx) => {
        // One managed key per user per product: a product's key rotates only
        // that product's key, never the user's direct Synapse key
        const [existingKey] = await tx
          .select({ id: apiKeyTable.id })
          .from(apiKeyTable)
          .where(
            and(
              eq(apiKeyTable.userId, user.id),
              eq(apiKeyTable.mode, "managed"),
              eq(apiKeyTable.name, keyName),
              scope
                ? eq(apiKeyTable.appId, scope.appId)
                : isNull(apiKeyTable.appId),
              isNull(apiKeyTable.revokedAt),
            ),
          )
          .limit(1);

        if (existingKey) {
          // Rotate: update the existing row with new key hash/hint
          // Rotate: update the existing row with new key hash/hint (and the
          // entity, which a product may re-point, e.g. user -> organization)
          await tx
            .update(apiKeyTable)
            .set({
              keyHash: hash,
              keyHint: hint,
              ...scopeColumns,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(apiKeyTable.id, existingKey.id));
        } else {
          // Create new managed key
          await tx.insert(apiKeyTable).values({
            userId: user.id,
            keyHash: hash,
            keyHint: hint,
            name: keyName,
            mode: "managed",
            ...scopeColumns,
          });
        }
      });
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
