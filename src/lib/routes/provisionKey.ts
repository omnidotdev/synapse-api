import { and, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { generateApiKey } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";

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

    if (!GATEWAY_SECRET || secret !== GATEWAY_SECRET) {
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

    const keyName = `${body.source || DEFAULT_KEY_SOURCE} (auto)`;

    // Generate a fresh API key
    const { raw, hash, hint } = generateApiKey();

    // Check for existing active managed key
    const [existingKey] = await dbPool
      .select()
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
      const now = new Date().toISOString();

      await dbPool
        .update(apiKeyTable)
        .set({ keyHash: hash, keyHint: hint, updatedAt: now })
        .where(eq(apiKeyTable.id, existingKey.id));
    } else {
      // Create new managed key
      await dbPool.insert(apiKeyTable).values({
        userId: user.id,
        keyHash: hash,
        keyHint: hint,
        name: keyName,
        mode: "managed",
      });
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
    }),
  },
);

export default provisionKeyRoute;
