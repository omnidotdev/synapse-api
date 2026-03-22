import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { generateApiKey } from "lib/crypto";
import { usageEventTable } from "lib/db/schema";
import reportUsageRoute from "lib/routes/reportUsage";
import { apiKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const GATEWAY_SECRET = "test-gateway-secret";

const app = new Elysia().use(reportUsageRoute);

/** Send a report-usage request with optional gateway secret */
const reportUsage = (
	events: Record<string, unknown>[],
	secret?: string,
) =>
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

describe("POST /internal/report-usage", () => {
	test("returns 401 without gateway secret", async () => {
		const res = await reportUsage([]);
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("records batch of usage events", async () => {
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
		});

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
			{
				userId: user.id,
				apiKeyId: apiKey.id,
				provider: "openai",
				model: "gpt-4o",
				inputTokens: 200,
				outputTokens: 100,
				costCents: 10,
				mode: "managed",
			},
		];

		const res = await reportUsage(events, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.recorded).toBe(2);

		// Verify events persisted in the database
		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.userId, user.id));

		expect(rows).toHaveLength(2);
	});

	test("handles empty events array", async () => {
		const res = await reportUsage([], GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.recorded).toBe(0);
	});
});
