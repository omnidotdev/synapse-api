import { and, eq, gte, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import { constantTimeEqual } from "lib/crypto";
import { dbPool } from "lib/db";
import { usageEventTable, userTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { events } from "lib/providers";

/**
 * Internal endpoint for gateway usage reporting
 */
const reportUsageRoute = new Elysia().post(
  "/internal/report-usage",
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

    if (body.events.length === 0) {
      return { recorded: 0 };
    }

    // The gateway sends identityProviderId as userId (needed for Aether billing).
    // Map it to the internal DB user ID for the FK constraint on usage_event.
    const idpId = body.events[0].userId;
    const [user] = await dbPool
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.identityProviderId, idpId))
      .limit(1);

    const internalUserId = user?.id ?? idpId;

    const mappedEvents = body.events.map((e) => ({
      ...e,
      userId: internalUserId,
    }));

    await dbPool.insert(usageEventTable).values(mappedEvents);

    // Publish usage event (best-effort, fire-and-forget)
    const first = body.events[0];
    const organizationId = first.workspaceId ?? first.userId;

    publish({
      type: "synapse.usage.recorded",
      source: "omni.synapse",
      organizationId,
      subject: first.userId,
      data: {
        count: body.events.length,
        userId: first.userId,
        workspaceId: first.workspaceId,
      },
    }).catch(() => {});
    void events.emit({
      type: "synapse.usage.recorded",
      data: {
        count: body.events.length,
        userId: first.userId,
        workspaceId: first.workspaceId,
      },
      organizationId,
      subject: first.userId,
    });

    // Check daily token usage against plan rate limits (best-effort, fire-and-forget)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Tokens contributed by this batch (used to detect threshold crossing)
    const batchTokens = body.events.reduce(
      (sum, e) => sum + e.inputTokens + e.outputTokens,
      0,
    );

    // noinspection ES6MissingAwait (fire-and-forget)
    void Promise.all([
      dbPool
        .select({ plan: userTable.plan })
        .from(userTable)
        .where(eq(userTable.id, internalUserId))
        .limit(1),
      dbPool
        .select({
          totalTokens: sql<number>`coalesce(sum(${usageEventTable.inputTokens} + ${usageEventTable.outputTokens}), 0)::int`,
        })
        .from(usageEventTable)
        .where(
          and(
            eq(usageEventTable.userId, internalUserId),
            gte(usageEventTable.createdAt, startOfDay.toISOString()),
          ),
        ),
    ])
      .then(([[user], [usage]]) => {
        const plan = (user?.plan ?? "free") as keyof typeof PLAN_RATE_LIMITS;
        const limits = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;
        const dailyTokens = usage?.totalTokens ?? 0;

        // Only fire when crossing from below to at/above threshold (not on every batch)
        // Skip threshold check for BYOK-only plans (managedTokenBudget === 0)
        const tokensBeforeThisReport = Math.max(0, dailyTokens - batchTokens);
        const budget = limits.managedTokenBudget;
        const hasLimit = budget > 0;
        const wasAlreadyAbove =
          hasLimit && tokensBeforeThisReport >= budget * 0.8;
        const isNowAbove = hasLimit && dailyTokens >= budget * 0.8;

        if (isNowAbove && !wasAlreadyAbove) {
          publish({
            type: "synapse.usage.threshold",
            source: "omni.synapse",
            organizationId,
            subject: first.userId,
            data: {
              thresholdType: "managed_token_budget",
              current: dailyTokens,
              limit: budget,
              userId: first.userId,
              workspaceId: first.workspaceId,
            },
          }).catch(() => {});
          void events.emit({
            type: "synapse.usage.threshold",
            data: {
              thresholdType: "managed_token_budget",
              current: dailyTokens,
              limit: budget,
              userId: first.userId,
              workspaceId: first.workspaceId,
            },
            organizationId,
            subject: first.userId,
          });
        }
      })
      .catch(() => {});

    return { recorded: body.events.length };
  },
  {
    body: t.Object({
      events: t.Array(
        t.Object({
          userId: t.String(),
          workspaceId: t.Optional(t.String()),
          apiKeyId: t.String(),
          provider: t.String(),
          model: t.String(),
          inputTokens: t.Number({ minimum: 0 }),
          outputTokens: t.Number({ minimum: 0 }),
          costCents: t.Number({ minimum: 0 }),
          mode: t.String(),
        }),
      ),
    }),
  },
);

export default reportUsageRoute;
