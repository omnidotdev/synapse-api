import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { BILLING_SERVICE_API_KEY } from "lib/config/env.config";
import { constantTimeEqual } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, usageEventTable } from "lib/db/schema";

/**
 * Aether app a direct (unscoped) Synapse key bills, matching the gateway's
 * `BILLING_APP_ID`
 */
const DIRECT_KEY_APP_ID = "synapse";

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The UTC bounds of a `YYYY-MM-DD` day, or null when it is not a real day */
const dayBounds = (date: string): { start: Date; end: Date } | null => {
  const match = DAY_PATTERN.exec(date);
  if (!match) return null;

  const start = new Date(`${date}T00:00:00.000Z`);
  // Reject rollovers like 2026-02-31 that Date silently normalizes
  if (
    Number.isNaN(start.getTime()) ||
    start.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

/**
 * Internal per-product daily usage, read by Aether's daily AI reconciliation
 * to compare what the gateway metered against what Aether charged.
 *
 * Authenticated with the pairwise Synapse/Aether service key (the
 * `BILLING_SERVICE_API_KEY` synapse-api already presents to Aether), sent back
 * by Aether in `x-service-api-key`. Every request is rejected when no key is
 * configured
 */
export const createDailyUsageRoute = ({
  serviceApiKey,
}: {
  serviceApiKey: string | undefined;
}) =>
  new Elysia().get(
    "/internal/usage/daily",
    async ({ headers, query, set }) => {
      const key = headers["x-service-api-key"];

      if (!serviceApiKey || !key || !constantTimeEqual(key, serviceApiKey)) {
        set.status = 401;
        return { error: "unauthorized" };
      }

      const bounds = dayBounds(query.date);
      if (!bounds) {
        set.status = 400;
        return { error: "invalid date, expected YYYY-MM-DD" };
      }

      // Inlined (a code constant, never input) so the select and group by
      // render the identical expression; bound twice it would be two params
      const appId = sql<string>`coalesce(${apiKeyTable.appId}, ${sql.raw(`'${DIRECT_KEY_APP_ID}'`)})`;

      // Managed spend only: BYOK runs on the caller's provider key and is never
      // charged. `manual` keys are reported as `managed` by the gateway. Every
      // modality is included, as Aether charges each. A record is a served
      // request that cost something: the gateway never charges a zero cost,
      // so counting those would read as a missing charge
      const rows = await dbPool
        .select({
          appId,
          costCents: sql<number>`coalesce(sum(${usageEventTable.costCents}), 0)::float8`,
          events: sql<number>`(count(*) filter (where ${usageEventTable.costCents} > 0))::int`,
        })
        .from(usageEventTable)
        .innerJoin(apiKeyTable, eq(apiKeyTable.id, usageEventTable.apiKeyId))
        .where(
          and(
            eq(usageEventTable.mode, "managed"),
            gte(usageEventTable.createdAt, bounds.start.toISOString()),
            lt(usageEventTable.createdAt, bounds.end.toISOString()),
          ),
        )
        .groupBy(appId)
        .orderBy(appId);

      return { date: query.date, apps: rows };
    },
    {
      query: t.Object({ date: t.String() }),
    },
  );

/** Daily usage route, keyed to the configured Aether service key */
const dailyUsageRoute = createDailyUsageRoute({
  serviceApiKey: BILLING_SERVICE_API_KEY,
});

export default dailyUsageRoute;
