/**
 * IDP webhook handler for organization lifecycle events.
 *
 * Handles events from the IDP when organizations are deleted.
 * Extend this handler to clean up org-scoped resources as needed.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { AUTH_WEBHOOK_SECRET } from "lib/config/env.config";
import { dbPool } from "lib/db";
import { apiKeyTable } from "lib/db/schema/apiKey.table";
import { workspaceTable } from "lib/db/schema/workspace.table";

interface IDPWebhookPayload {
  eventType: "organization.deleted";
  organizationId: string;
  deletedAt: string;
}

/**
 * Verify HMAC-SHA256 signature from the IDP.
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
 * Handle organization deletion.
 * Clean up org-scoped resources (workspaces, API keys).
 */
const handleOrganizationDeleted = async (
  payload: IDPWebhookPayload,
): Promise<void> => {
  const { organizationId, deletedAt } = payload;

  // Find workspaces scoped to this organization
  const workspaces = await dbPool
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(eq(workspaceTable.organizationId, organizationId));

  const workspaceIds = workspaces.map((w) => w.id);

  if (workspaceIds.length > 0) {
    await dbPool.transaction(async (tx) => {
      // Soft-revoke API keys scoped to those workspaces
      await tx
        .update(apiKeyTable)
        .set({ revokedAt: new Date().toISOString() })
        .where(inArray(apiKeyTable.workspaceId, workspaceIds));

      // Delete the workspaces (usage events are kept for audit)
      await tx
        .delete(workspaceTable)
        .where(eq(workspaceTable.organizationId, organizationId));
    });
  }

  // biome-ignore lint/suspicious/noConsole: structured logging
  console.log(
    JSON.stringify({
      type: "idp_webhook_processed",
      event: "organization.deleted",
      organizationId,
      deletedAt,
      workspacesRemoved: workspaceIds.length,
      timestamp: new Date().toISOString(),
    }),
  );
};

/**
 * IDP webhook receiver.
 * Receives organization lifecycle events from the IDP.
 *
 * This handler:
 * 1. Verifies HMAC-SHA256 signature
 * 2. Processes organization lifecycle events
 */
const idpWebhook = new Elysia().post(
  "/idp",
  async ({ request, headers, set }) => {
    const signature = headers["x-idp-signature"];
    if (!AUTH_WEBHOOK_SECRET) {
      set.status = 503;
      return { error: "Webhook handler not configured" };
    }

    try {
      const rawBody = await request.text();

      // verify signature
      if (signature) {
        const isValid = verifySignature(
          rawBody,
          signature,
          AUTH_WEBHOOK_SECRET,
        );

        if (!isValid) {
          set.status = 401;
          return { error: "Invalid signature" };
        }
      } else {
        set.status = 401;
        return { error: "Missing signature" };
      }

      const body = JSON.parse(rawBody) as IDPWebhookPayload;

      switch (body.eventType) {
        case "organization.deleted":
          await handleOrganizationDeleted(body);
          break;
        default:
          console.warn(`Unknown IDP event type: ${body.eventType}`);
      }

      set.status = 200;
      return { received: true };
    } catch (err) {
      console.error("Error processing IDP webhook:", err);
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  },
  {
    headers: t.Object({
      "x-idp-signature": t.Optional(t.String()),
      "x-idp-event": t.Optional(t.String()),
    }),
  },
);

export default idpWebhook;
