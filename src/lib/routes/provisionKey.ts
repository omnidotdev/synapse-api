import { and, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { constantTimeEqual, generateApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";
import { billing } from "lib/providers";

import type { PlanTier } from "lib/config/plans.config";

const DEFAULT_KEY_SOURCE = "Managed";

/**
 * Internal endpoint for auto-provisioning a managed API key
 *
 * Called by beacon-gateway when a cloud user chats without a BYOK key.
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

    // Upsert user via identityProviderId (same pattern as auth plugin)
    const insertedUser = {
      identityProviderId: body.identityProviderId,
      ...(body.email && { email: body.email }),
      ...(body.name && { name: body.name }),
    };

    const { identityProviderId, ...rest } = insertedUser;

    const [user] = await dbPool
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

    // Check api_access entitlement before provisioning.
    // If Aether returns entitlements but api_access is explicitly revoked
    // (value === "false"), deny the request. Gracefully allow if Aether
    // is unreachable or returns null.
    const entitlements = await billing
      .getEntitlements("user", user.identityProviderId ?? user.id, "synapse")
      .catch(() => null);

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

    // Upsert managed key inside a transaction to prevent duplicates
    await dbPool.transaction(async (tx) => {
      const [existingKey] = await tx
        .select({ id: apiKeyTable.id })
        .from(apiKeyTable)
        .where(
          and(
            eq(apiKeyTable.userId, user.id),
            eq(apiKeyTable.mode, "managed"),
            eq(apiKeyTable.name, keyName),
            isNull(apiKeyTable.revokedAt),
          ),
        )
        .limit(1);

      if (existingKey) {
        // Rotate: update the existing row with new key hash/hint
        await tx
          .update(apiKeyTable)
          .set({
            keyHash: hash,
            keyHint: hint,
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
        });
      }
    });

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
    }),
  },
);

export default provisionKeyRoute;
