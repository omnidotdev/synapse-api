import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { BILLING_WEBHOOK_SECRET } from "lib/config/env.config";
import { dbPool } from "lib/db";
import { userTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { billing } from "lib/providers";

import type { PlanTier } from "lib/config/plans.config";

interface BillingWebhookPayload {
  eventType: string;
  entityType: string;
  entityId: string;
  productId: string;
  featureKey?: string;
  value?: unknown;
  version: number;
  timestamp: string;
  billingAccountId?: string;
}

/**
 * Verify HMAC-SHA256 signature from the billing service.
 */
const verifySignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

/**
 * Process an entitlement webhook event from the billing service.
 * Verifies HMAC-SHA256 signature, invalidates local billing cache,
 * and syncs user plan tier.
 */
async function processWebhook(request: Request, signature?: string) {
  if (!BILLING_WEBHOOK_SECRET) {
    console.warn(
      "BILLING_WEBHOOK_SECRET not set - rejecting unverifiable webhook",
    );
    return { status: 403, body: { error: "Webhook secret not configured" } };
  }

  try {
    const rawBody = await request.text();

    if (BILLING_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(
        rawBody,
        signature,
        BILLING_WEBHOOK_SECRET,
      );

      if (!isValid) {
        return { status: 401, body: { error: "Invalid signature" } };
      }
    } else if (BILLING_WEBHOOK_SECRET && !signature) {
      return { status: 401, body: { error: "Missing signature" } };
    }

    const body = JSON.parse(rawBody) as BillingWebhookPayload;

    switch (body.eventType) {
      case "entitlement.created":
      case "entitlement.updated":
      case "entitlement.deleted":
        billing.invalidateCache?.(body.entityType, body.entityId);

        if (
          body.featureKey === "tier" &&
          body.entityType === "user" &&
          body.eventType !== "entitlement.deleted"
        ) {
          const newTier = body.value as PlanTier;

          if (newTier && ["free", "pro", "team"].includes(newTier)) {
            dbPool
              .update(userTable)
              .set({
                plan: newTier,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(userTable.identityProviderId, body.entityId))
              .execute()
              .catch((err) => console.error("Failed to sync user.plan:", err));
          }
        }

        void publish({
          type: "synapse.entitlement.changed",
          source: "omni.synapse",
          organizationId: body.entityId,
          subject: body.entityId,
          data: {
            eventType: body.eventType,
            entityType: body.entityType,
            entityId: body.entityId,
            productId: body.productId,
            featureKey: body.featureKey,
          },
        });
        break;
      default:
        break;
    }

    return { status: 200, body: { received: true } };
  } catch (err) {
    console.error("Error processing billing webhook:", err);
    return { status: 500, body: { error: "Internal Server Error" } };
  }
}

const webhookSchema = {
  headers: t.Object({
    "x-billing-signature": t.Optional(t.String()),
  }),
};

/**
 * Billing webhook receiver with both /billing and /entitlements paths.
 */
const billingWebhook = new Elysia()
  .post(
    "/billing",
    async ({ request, headers, set }) => {
      const result = await processWebhook(
        request,
        headers["x-billing-signature"],
      );
      set.status = result.status;
      return result.body;
    },
    webhookSchema,
  )
  .post(
    "/entitlements",
    async ({ request, headers, set }) => {
      const result = await processWebhook(
        request,
        headers["x-billing-signature"],
      );
      set.status = result.status;
      return result.body;
    },
    webhookSchema,
  );

export default billingWebhook;
