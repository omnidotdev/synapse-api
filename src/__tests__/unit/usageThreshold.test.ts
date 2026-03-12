import { randomBytes } from "node:crypto";

process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.GATEWAY_SECRET ??= "test-gateway-secret";

import { describe, expect, test } from "bun:test";
import { and, eq, gte } from "drizzle-orm";
import { Elysia } from "elysia";

import { generateApiKey } from "lib/crypto";
import { usageEventTable } from "lib/db/schema";
import reportUsageRoute from "lib/routes/reportUsage";
import { apiKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const GATEWAY_SECRET = process.env.GATEWAY_SECRET ?? "test-gateway-secret";

const app = new Elysia().use(reportUsageRoute);

const reportUsage = (events: Record<string, unknown>[], secret?: string) =>
	app.handle(
		new Request("http://test/internal/report-usage", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(secret !== undefined ? { "x-gateway-secret": secret } : {}),
			},
			body: JSON.stringify({ events }),
		}),
	);

const ctx = setupTestContext();

describe("reportUsage - usage recording", () => {
	test("records usage events and returns correct count", async () => {
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id, keyHash: hash, keyHint: hint });

		const events = [
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 100,
				outputTokens: 50,
				costCents: 5,
				mode: "byok",
			},
		];

		const res = await reportUsage(events, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.recorded).toBe(1);
	});

	test("persists usage events to database", async () => {
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id, keyHash: hash, keyHint: hint });

		const events = [
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 150,
				outputTokens: 75,
				costCents: 8,
				mode: "byok",
			},
		];

		await reportUsage(events, GATEWAY_SECRET);

		// Allow fire-and-forget DB writes to flush
		await new Promise((r) => setTimeout(r, 50));

		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.apiKeyId, apiKey.id));

		expect(rows).toHaveLength(1);
		expect(rows[0].inputTokens).toBe(150);
		expect(rows[0].outputTokens).toBe(75);
	});

	test("accumulates daily token usage across multiple batches", async () => {
		// Use free plan — tokensPerDay = 16_000
		const user = await userFactory.create(ctx.db, { plan: "free" });
		const { hash, hint } = generateApiKey();
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id, keyHash: hash, keyHint: hint });

		// Pre-seed existing usage for today
		await ctx.db.insert(usageEventTable).values({
			userId: user.id,
			apiKeyId: apiKey.id,
			provider: "anthropic",
			model: "claude-sonnet-4-20250514",
			inputTokens: 6_400,
			outputTokens: 6_200,
			costCents: 0,
			mode: "byok",
			createdAt: new Date().toISOString(),
		});

		// Report additional tokens
		const events = [
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 150,
				outputTokens: 150,
				costCents: 1,
				mode: "byok",
			},
		];

		const res = await reportUsage(events, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		// Allow fire-and-forget DB writes to flush
		await new Promise((r) => setTimeout(r, 50));

		// Verify total daily usage is accumulated
		const startOfDay = new Date();
		startOfDay.setUTCHours(0, 0, 0, 0);

		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(
				and(
					eq(usageEventTable.userId, user.id),
					gte(usageEventTable.createdAt, startOfDay.toISOString()),
				),
			);

		const totalTokens = rows.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
		// 6400+6200 (pre-seeded) + 150+150 (new batch) = 12900
		expect(totalTokens).toBe(12_900);
	});
});
