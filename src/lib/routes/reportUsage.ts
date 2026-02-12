import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { dbPool } from "lib/db";
import { usageEventTable } from "lib/db/schema";

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
          inputTokens: t.Number(),
          outputTokens: t.Number(),
          costCents: t.Number(),
          mode: t.String(),
        }),
      ),
    }),
  },
);

export default reportUsageRoute;
