import { and, eq, gte, lte, sql } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { usageEventTable, workspaceTable } from "lib/db/schema";
import { authz } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

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
      async usageBreakdown(
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

          conditions.push(eq(usageEventTable.workspaceId, args.workspaceId));
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
    },
  },
});

export default usageAggregationPlugin;
