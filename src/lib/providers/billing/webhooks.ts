import { createHmac, timingSafeEqual } from "node:crypto";

import { Elysia, t } from "elysia";

import { BILLING_WEBHOOK_SECRET } from "lib/config/env.config";
import { publish } from "lib/events/publisher";
import { billing } from "lib/providers";

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
 * Billing webhook receiver.
 * Receives entitlement change events from the billing service.
 *
 * This handler:
 * 1. Verifies HMAC-SHA256 signature
 * 2. Invalidates local billing cache
 */
const billingWebhook = new Elysia().post(
  "/billing",
  async ({ request, headers, set }) => {
    const signature = headers["x-billing-signature"];

    if (!BILLING_WEBHOOK_SECRET) {
      console.warn(
        "BILLING_WEBHOOK_SECRET not set - rejecting unverifiable webhook",
      );
      set.status = 403;
      return { error: "Webhook secret not configured" };
    }

    try {
      const rawBody = await request.text();

      // Verify signature if secret is configured
      if (BILLING_WEBHOOK_SECRET && signature) {
        const isValid = verifySignature(
          rawBody,
          signature,
          BILLING_WEBHOOK_SECRET,
        );

        if (!isValid) {
          set.status = 401;
          return { error: "Invalid signature" };
        }
      } else if (BILLING_WEBHOOK_SECRET && !signature) {
        set.status = 401;
        return { error: "Missing signature" };
      }

      const body = JSON.parse(rawBody) as BillingWebhookPayload;

      // Handle events - invalidate local cache
      switch (body.eventType) {
        case "entitlement.created":
        case "entitlement.updated":
        case "entitlement.deleted":
          // Invalidate all cached entitlements for this entity
          billing.invalidateCache?.(body.entityType, body.entityId);

          // Publish event (best-effort, fire-and-forget)
          void publish({
            type: "synapse.entitlement.changed",
            source: "synapse-api",
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

      set.status = 200;
      return { received: true };
    } catch (err) {
      console.error("Error processing billing webhook:", err);
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  },
  {
    headers: t.Object({
      "x-billing-signature": t.Optional(t.String()),
    }),
  },
);

export default billingWebhook;
