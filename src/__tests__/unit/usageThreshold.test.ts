import { randomBytes } from "node:crypto";

process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.GATEWAY_SECRET ??= "test-gateway-secret";

import { describe, expect, mock, test } from "bun:test";

// Mock the publisher before importing the route
const mockPublish = mock(async () => null);

mock.module("lib/events/publisher", () => ({
	publish: mockPublish,
	initPublisher: mock(async () => {}),
	closePublisher: mock(() => {}),
}));

import { Elysia } from "elysia";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
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

describe("reportUsage - usage threshold events", () => {
	test("publishes synapse.usage.recorded on every batch", async () => {
		mockPublish.mockClear();

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

		// Allow fire-and-forget promises to flush
		await new Promise((r) => setTimeout(r, 50));

		const calls = (mockPublish.mock.calls as unknown as [unknown][]).map(
			(c) => (c[0] as Record<string, unknown>).type,
		);
		expect(calls).toContain("synapse.usage.recorded");
	});

	test("publishes synapse.usage.threshold when daily tokens reach 80% of plan limit", async () => {
		mockPublish.mockClear();

		// Use free plan — tokensPerDay = 50_000; 80% = 40_000
		const user = await userFactory.create(ctx.db, { plan: "free" });
		const { hash, hint } = generateApiKey();
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id, keyHash: hash, keyHint: hint });

		// Pre-seed existing usage for today to reach the threshold
		const startOfDay = new Date();
		startOfDay.setUTCHours(0, 0, 0, 0);

		await ctx.db.insert(usageEventTable).values({
			userId: user.id,
			apiKeyId: apiKey.id,
			provider: "anthropic",
			model: "claude-sonnet-4-20250514",
			// 39_900 tokens already used
			inputTokens: 20_000,
			outputTokens: 19_900,
			costCents: 0,
			mode: "byok",
			createdAt: new Date().toISOString(),
		});

		// Report an additional 200 tokens to push past 40_000 (80% of 50_000)
		const events = [
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 100,
				outputTokens: 100,
				costCents: 1,
				mode: "byok",
			},
		];

		const res = await reportUsage(events, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		// Allow fire-and-forget DB query + publish to complete
		await new Promise((r) => setTimeout(r, 100));

		const allCalls = mockPublish.mock.calls as unknown as [unknown][];
		const thresholdCalls = allCalls.filter(
			(c) => (c[0] as Record<string, unknown>).type === "synapse.usage.threshold",
		);
		expect(thresholdCalls.length).toBeGreaterThan(0);

		const event = thresholdCalls[0][0] as Record<string, unknown>;
		expect(event.source).toBe("synapse-api");
		expect(event.organizationId).toBe(user.id);
		expect(event.subject).toBe(user.id);

		const data = event.data as Record<string, unknown>;
		expect(data.thresholdType).toBe("rate_limit");
		expect(typeof data.current).toBe("number");
		expect(data.limit).toBe(PLAN_RATE_LIMITS.free.tokensPerDay);
		expect(data.userId).toBe(user.id);
	});

	test("does not publish synapse.usage.threshold when usage is below 80%", async () => {
		mockPublish.mockClear();

		const user = await userFactory.create(ctx.db, { plan: "free" });
		const { hash, hint } = generateApiKey();
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id, keyHash: hash, keyHint: hint });

		// Only 100 tokens — well under the 40_000 threshold
		const events = [
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "openai",
				model: "gpt-4o",
				inputTokens: 60,
				outputTokens: 40,
				costCents: 1,
				mode: "byok",
			},
		];

		const res = await reportUsage(events, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		await new Promise((r) => setTimeout(r, 100));

		const allCalls2 = mockPublish.mock.calls as unknown as [unknown][];
		const thresholdCalls = allCalls2.filter(
			(c) => (c[0] as Record<string, unknown>).type === "synapse.usage.threshold",
		);
		expect(thresholdCalls.length).toBe(0);
	});
});
