import { and, eq, gte, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
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

    if (!GATEWAY_SECRET || secret !== GATEWAY_SECRET) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    if (body.events.length === 0) {
      return { recorded: 0 };
    }

    await dbPool.insert(usageEventTable).values(body.events);

    // Publish usage event (best-effort, fire-and-forget)
    const first = body.events[0];
    const organizationId = first.workspaceId ?? first.userId;

    publish({
      type: "synapse.usage.recorded",
      source: "synapse-api",
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

    // noinspection ES6MissingAwait — fire-and-forget
    void Promise.all([
      dbPool
        .select({ plan: userTable.plan })
        .from(userTable)
        .where(eq(userTable.id, first.userId))
        .limit(1),
      dbPool
        .select({
          totalTokens: sql<number>`coalesce(sum(${usageEventTable.inputTokens} + ${usageEventTable.outputTokens}), 0)::int`,
        })
        .from(usageEventTable)
        .where(
          and(
            eq(usageEventTable.userId, first.userId),
            gte(usageEventTable.createdAt, startOfDay.toISOString()),
          ),
        ),
    ])
      .then(([[user], [usage]]) => {
        const plan = (user?.plan ?? "free") as keyof typeof PLAN_RATE_LIMITS;
        const limits = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;
        const dailyTokens = usage?.totalTokens ?? 0;

        // Only fire when crossing from below to at/above threshold (not on every batch)
        const tokensBeforeThisReport = Math.max(0, dailyTokens - batchTokens);
        const wasAlreadyAbove =
          tokensBeforeThisReport >= limits.tokensPerDay * 0.8;
        const isNowAbove = dailyTokens >= limits.tokensPerDay * 0.8;

        if (isNowAbove && !wasAlreadyAbove) {
          publish({
            type: "synapse.usage.threshold",
            source: "synapse-api",
            organizationId,
            subject: first.userId,
            data: {
              thresholdType: "rate_limit",
              current: dailyTokens,
              limit: limits.tokensPerDay,
              userId: first.userId,
              workspaceId: first.workspaceId,
            },
          }).catch(() => {});
          void events.emit({
            type: "synapse.usage.threshold",
            data: {
              thresholdType: "rate_limit",
              current: dailyTokens,
              limit: limits.tokensPerDay,
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
          costCents: t.Number(),
          mode: t.String(),
        }),
      ),
    }),
  },
);

export default reportUsageRoute;
