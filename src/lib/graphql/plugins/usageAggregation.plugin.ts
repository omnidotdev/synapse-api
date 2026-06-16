import { and, eq, gte, lte, sql } from "drizzle-orm";
import { EXPORTABLE } from "graphile-export";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { usageEventTable, workspaceTable } from "lib/db/schema";
import { authz, billing } from "lib/providers";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

// Fallback retention windows when Aether is unreachable (mirrors omni-api SSOT)
const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  free: 7,
  pro: 90,
  team: 365,
};

/**
 * Resolve the analytics_retention_days entitlement for the given entitlements
 * payload. Falls back to free-tier (7 days) when the entitlement is absent.
 * A value of -1 means unlimited (treated as 366 days, the max supported range).
 */
const resolveRetentionDays = EXPORTABLE(
  (DEFAULT_RETENTION_DAYS) =>
    (entitlements: EntitlementsResponse | null, tier: string): number => {
      const entry = entitlements?.entitlements?.find(
        (e) => e.featureKey === "analytics_retention_days",
      );

      if (entry?.value != null) {
        const val = Number(String(entry.value).replace(/"/g, ""));
        if (Number.isFinite(val)) {
          return val === -1 ? 366 : val;
        }
      }

      return DEFAULT_RETENTION_DAYS[tier] ?? DEFAULT_RETENTION_DAYS.free;
    },
  [DEFAULT_RETENTION_DAYS],
);

/**
 * Usage aggregation queries for charts and breakdowns
 */
const usageAggregationPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    type ModelBreakdown {
      model: String!
      provider: String!
      inputTokens: Int!
      outputTokens: Int!
      requests: Int!
    }

    type DailyUsage {
      date: String!
      inputTokens: Int!
      outputTokens: Int!
      requests: Int!
    }

    type UsageBreakdown {
      byModel: [ModelBreakdown!]!
      byDay: [DailyUsage!]!
    }

    extend type Query {
      """
      Aggregated usage breakdown by model and day for charts.
      Optionally filter by workspaceId for workspace-scoped usage.
      """
      usageBreakdown(startDate: String!, endDate: String!, workspaceId: String): UsageBreakdown
    }
  `,
  resolvers: {
    Query: {
      usageBreakdown: EXPORTABLE(
        (
          GraphQLError,
          and,
          eq,
          gte,
          lte,
          sql,
          usageEventTable,
          workspaceTable,
          authz,
          billing,
          resolveRetentionDays,
        ) =>
          async function usageBreakdown(
            _source: unknown,
            args: { startDate: string; endDate: string; workspaceId?: string },
            ctx: GraphQLContext,
          ) {
            const { observer, db } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            // Validate date inputs
            const startDate = new Date(args.startDate);
            const endDate = new Date(args.endDate);

            if (Number.isNaN(startDate.getTime())) {
              throw new GraphQLError("Invalid startDate", {
                extensions: { code: "BAD_USER_INPUT" },
              });
            }

            if (Number.isNaN(endDate.getTime())) {
              throw new GraphQLError("Invalid endDate", {
                extensions: { code: "BAD_USER_INPUT" },
              });
            }

            if (startDate > endDate) {
              throw new GraphQLError("startDate must not be after endDate", {
                extensions: { code: "BAD_USER_INPUT" },
              });
            }

            const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
            if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
              throw new GraphQLError("Date range must not exceed 366 days", {
                extensions: { code: "BAD_USER_INPUT" },
              });
            }

            // Enforce analytics_retention_days entitlement: the requested startDate
            // must not look further back than the user's plan permits. Workspace
            // queries use the organization entity, otherwise the observer's user
            // entity is used.
            const retentionEntity = args.workspaceId
              ? ("organization" as const)
              : ("user" as const);
            const retentionEntityId =
              retentionEntity === "user"
                ? (observer.identityProviderId ?? observer.id)
                : null;

            const retentionEntitlements =
              retentionEntity === "user" && retentionEntityId
                ? await billing
                    .getEntitlements(
                      retentionEntity,
                      retentionEntityId,
                      "synapse",
                    )
                    .catch(() => null)
                : null;

            const tier = (observer.plan ?? "free") as string;
            const retentionDays = resolveRetentionDays(
              retentionEntitlements,
              tier,
            );

            const earliestAllowed = new Date(
              Date.now() - retentionDays * 24 * 60 * 60 * 1000,
            );

            if (startDate < earliestAllowed) {
              throw new GraphQLError(
                `Your plan allows ${retentionDays} days of analytics history. Upgrade for longer retention`,
                { extensions: { code: "QUOTA_EXCEEDED" } },
              );
            }

            const conditions = [
              eq(usageEventTable.userId, observer.id),
              gte(usageEventTable.createdAt, args.startDate),
              lte(usageEventTable.createdAt, args.endDate),
            ];

            if (args.workspaceId) {
              // Verify the observer has viewer permission on the workspace's org
              const [workspace] = await db
                .select({ organizationId: workspaceTable.organizationId })
                .from(workspaceTable)
                .where(eq(workspaceTable.id, args.workspaceId));

              if (!workspace) {
                throw new GraphQLError("Workspace not found", {
                  extensions: { code: "NOT_FOUND" },
                });
              }

              if (authz) {
                const allowed = await authz.checkPermission(
                  observer.id,
                  "organization",
                  workspace.organizationId,
                  "viewer",
                );

                if (!allowed) {
                  throw new GraphQLError(
                    "Insufficient permissions: requires viewer",
                    { extensions: { code: "FORBIDDEN" } },
                  );
                }
              }

              conditions.push(
                eq(usageEventTable.workspaceId, args.workspaceId),
              );
            }

            const dateFilter = and(...conditions);

            // Per-model breakdown
            const byModel = await db
              .select({
                model: usageEventTable.model,
                provider: usageEventTable.provider,
                inputTokens: sql<number>`sum(${usageEventTable.inputTokens})::int`,
                outputTokens: sql<number>`sum(${usageEventTable.outputTokens})::int`,
                requests: sql<number>`count(*)::int`,
              })
              .from(usageEventTable)
              .where(dateFilter)
              .groupBy(usageEventTable.model, usageEventTable.provider);

            // Daily breakdown
            const byDay = await db
              .select({
                date: sql<string>`date_trunc('day', ${usageEventTable.createdAt})::date::text`,
                inputTokens: sql<number>`sum(${usageEventTable.inputTokens})::int`,
                outputTokens: sql<number>`sum(${usageEventTable.outputTokens})::int`,
                requests: sql<number>`count(*)::int`,
              })
              .from(usageEventTable)
              .where(dateFilter)
              .groupBy(sql`date_trunc('day', ${usageEventTable.createdAt})`)
              .orderBy(sql`date_trunc('day', ${usageEventTable.createdAt})`);

            return { byModel, byDay };
          },
        [
          GraphQLError,
          and,
          eq,
          gte,
          lte,
          sql,
          usageEventTable,
          workspaceTable,
          authz,
          billing,
          resolveRetentionDays,
        ],
      ),
    },
  },
});

export default usageAggregationPlugin;
