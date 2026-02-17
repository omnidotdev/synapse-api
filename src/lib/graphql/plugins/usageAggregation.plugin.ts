import { and, eq, gte, lte, sql } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { usageEventTable } from "lib/db/schema";

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
      Aggregated usage breakdown by model and day for charts
      """
      usageBreakdown(startDate: String!, endDate: String!): UsageBreakdown
    }
  `,
	resolvers: {
		Query: {
			async usageBreakdown(
				_source: unknown,
				args: { startDate: string; endDate: string },
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				const dateFilter = and(
					eq(usageEventTable.userId, observer.id),
					gte(usageEventTable.createdAt, args.startDate),
					lte(usageEventTable.createdAt, args.endDate),
				);

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
