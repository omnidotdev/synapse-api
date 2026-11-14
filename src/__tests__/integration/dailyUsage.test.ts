import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { usageEventTable } from "lib/db/schema";
import { createDailyUsageRoute } from "lib/routes/dailyUsage";
import { apiKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const SERVICE_KEY = "test-aether-pairwise-key";

const app = new Elysia().use(
  createDailyUsageRoute({ serviceApiKey: SERVICE_KEY }),
);

const dailyUsage = (date: string, key?: string) =>
  app.handle(
    new Request(`http://test/internal/usage/daily?date=${date}`, {
      headers: key !== undefined ? { "x-service-api-key": key } : {},
    }),
  );

const ctx = setupTestContext();

/** Seed a usage record at a fixed time */
const usage = (
  userId: string,
  apiKeyId: string,
  costCents: number,
  createdAt: string,
  mode = "managed",
) => ({
  userId,
  apiKeyId,
  provider: "anthropic",
  model: "claude-haiku-5-5",
  inputTokens: 10,
  outputTokens: 5,
  costCents,
  mode,
  createdAt,
});

describe("GET /internal/usage/daily", () => {
  test("rejects a request without the service key", async () => {
    expect((await dailyUsage("2026-11-13")).status).toBe(401);
  });

  test("rejects a wrong service key", async () => {
    expect((await dailyUsage("2026-11-13", "wrong")).status).toBe(401);
  });

  test("rejects every request when no service key is configured", async () => {
    const unconfigured = new Elysia().use(
      createDailyUsageRoute({ serviceApiKey: undefined }),
    );
    const res = await unconfigured.handle(
      new Request("http://test/internal/usage/daily?date=2026-11-13", {
        headers: { "x-service-api-key": "" },
      }),
    );
    expect(res.status).toBe(401);
  });

  test("rejects a malformed date", async () => {
    expect((await dailyUsage("2026-13-45", SERVICE_KEY)).status).toBe(400);
    expect((await dailyUsage("yesterday", SERVICE_KEY)).status).toBe(400);
  });

  test("sums managed cost and records per product for one UTC day", async () => {
    const user = await userFactory.create(ctx.db);
    const facetKey = await apiKeyFactory.create(ctx.db, {
      userId: user.id,
      mode: "managed",
      appId: "facet",
      billingEntityType: "user",
      billingEntityId: user.id,
    });
    const directKey = await apiKeyFactory.create(ctx.db, {
      userId: user.id,
      mode: "managed",
    });
    const byokKey = await apiKeyFactory.create(ctx.db, {
      userId: user.id,
      mode: "byok",
    });

    await ctx.db.insert(usageEventTable).values([
      usage(user.id, facetKey.id, 3, "2026-11-13T00:00:00.000Z"),
      usage(user.id, facetKey.id, 0, "2026-11-13T12:00:00.000Z"),
      usage(user.id, facetKey.id, 7, "2026-11-13T23:59:59.999Z"),
      // A direct Synapse key bills the gateway's own app
      usage(user.id, directKey.id, 4, "2026-11-13T08:00:00.000Z"),
      // BYOK spend is the caller's, never charged by Aether
      usage(user.id, byokKey.id, 50, "2026-11-13T08:00:00.000Z", "byok"),
      // Other days
      usage(user.id, facetKey.id, 100, "2026-11-12T23:59:59.999Z"),
      usage(user.id, facetKey.id, 100, "2026-11-14T00:00:00.000Z"),
    ]);

    const res = await dailyUsage("2026-11-13", SERVICE_KEY);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      date: "2026-11-13",
      apps: [
        { appId: "facet", costCents: 10, events: 3 },
        { appId: "synapse", costCents: 4, events: 1 },
      ],
    });
  });

  test("returns no apps for a day without usage", async () => {
    const res = await dailyUsage("2026-01-01", SERVICE_KEY);
    expect(await res.json()).toEqual({ date: "2026-01-01", apps: [] });
  });
});
