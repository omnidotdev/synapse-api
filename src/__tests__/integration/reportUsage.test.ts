import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { generateApiKey } from "lib/crypto";
import { usageEventTable } from "lib/db/schema";
import { events } from "lib/providers";
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

	// SYNAPSE-1: a single gateway flush batches concurrent users, so each
	// event must be attributed to its OWN user, not the first event's identity.
	test("attributes each event in a multi-user batch to its own user", async () => {
		const userA = await userFactory.create(ctx.db);
		const userB = await userFactory.create(ctx.db);

		const keyA = await apiKeyFactory.create(ctx.db, { userId: userA.id });
		const keyB = await apiKeyFactory.create(ctx.db, { userId: userB.id });

		// The gateway reports identityProviderId as `userId`
		const events = [
			{
				userId: userA.identityProviderId,
				apiKeyId: keyA.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 100,
				outputTokens: 50,
				costCents: 5,
				mode: "managed",
			},
			{
				userId: userB.identityProviderId,
				apiKeyId: keyB.id,
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
		expect((await res.json()).recorded).toBe(2);

		const rowsA = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.userId, userA.id));
		const rowsB = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.userId, userB.id));

		// Each user is billed for ONLY their own event, resolved to the internal id
		expect(rowsA).toHaveLength(1);
		expect(rowsA[0]?.inputTokens).toBe(100);
		expect(rowsA[0]?.provider).toBe("anthropic");

		expect(rowsB).toHaveLength(1);
		expect(rowsB[0]?.inputTokens).toBe(200);
		expect(rowsB[0]?.provider).toBe("openai");
	});

	// SYNAPSE-2: the gateway reports at-least-once; a retried (identical) batch
	// must not double-insert rows or re-emit usage events.
	test("re-posting the same batch does not double-insert or double-emit", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });

		const batch = [
			{
				userId: user.identityProviderId,
				apiKeyId: apiKey.id,
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
				inputTokens: 100,
				outputTokens: 50,
				costCents: 5,
				mode: "managed",
			},
			{
				userId: user.identityProviderId,
				apiKeyId: apiKey.id,
				provider: "openai",
				model: "gpt-4o",
				inputTokens: 200,
				outputTokens: 100,
				costCents: 10,
				mode: "managed",
			},
		];

		const emitSpy = spyOn(events, "emit");

		try {
			const res1 = await reportUsage(batch, GATEWAY_SECRET);
			expect(res1.status).toBe(200);
			expect((await res1.json()).recorded).toBe(2);

			const rowsAfterFirst = await ctx.db
				.select()
				.from(usageEventTable)
				.where(eq(usageEventTable.userId, user.id));
			expect(rowsAfterFirst).toHaveLength(2);

			const emitsAfterFirst = emitSpy.mock.calls.length;
			// The first ingest emits at least one usage.recorded event
			expect(emitsAfterFirst).toBeGreaterThan(0);

			// Retry the identical batch (simulating a lost HTTP response)
			const res2 = await reportUsage(batch, GATEWAY_SECRET);
			expect(res2.status).toBe(200);
			// Still acknowledges the full batch to the gateway
			expect((await res2.json()).recorded).toBe(2);

			const rowsAfterRetry = await ctx.db
				.select()
				.from(usageEventTable)
				.where(eq(usageEventTable.userId, user.id));
			// No double insert
			expect(rowsAfterRetry).toHaveLength(2);
			// No re-emit for the deduped retry
			expect(emitSpy.mock.calls.length).toBe(emitsAfterFirst);
		} finally {
			emitSpy.mockRestore();
		}
	});
	// The gateway serializes an absent workspace as `null`; rejecting it
	// dropped every report a product-scoped key made
	test("accepts a null workspaceId from the gateway", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });

		const res = await reportUsage(
			[
				{
					eventId: randomUUID(),
					userId: user.identityProviderId,
					workspaceId: null,
					apiKeyId: apiKey.id,
					provider: "anthropic",
					model: "claude-haiku-5-5",
					inputTokens: 12,
					outputTokens: 3,
					costCents: 0.01,
					mode: "managed",
				},
			],
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);
		expect((await res.json()).recorded).toBe(1);

		const [row] = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.apiKeyId, apiKey.id));
		expect(row?.workspaceId).toBeNull();
	});

	test("stores sub-cent cost at the ledger's $0.0001 precision", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });

		const res = await reportUsage(
			[
				{
					userId: user.identityProviderId,
					apiKeyId: apiKey.id,
					provider: "anthropic",
					model: "claude-haiku-5-5",
					inputTokens: 12,
					outputTokens: 3,
					costCents: 0.37,
					mode: "managed",
				},
			],
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const [row] = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.apiKeyId, apiKey.id));
		expect(row?.costCents).toBe(0.37);
	});

	test("records the modality, defaulting to completion", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const base = {
			userId: user.identityProviderId,
			apiKeyId: apiKey.id,
			provider: "openai",
			inputTokens: 40,
			outputTokens: 0,
			costCents: 0.01,
			mode: "managed",
		};

		const res = await reportUsage(
			[
				{ ...base, model: "gpt-4o-mini" },
				{ ...base, model: "text-embedding-3-small", modality: "embedding" },
			],
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.apiKeyId, apiKey.id));
		const modalityOf = (model: string) =>
			rows.find((row) => row.model === model)?.modality;
		expect(modalityOf("gpt-4o-mini")).toBe("completion");
		expect(modalityOf("text-embedding-3-small")).toBe("embedding");
	});

	// Reports are flushed in batches, so the insert time can fall on the next
	// UTC day; the served time keeps a request on the day Aether charged it
	test("dates an event when it was served, never in the future", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const base = {
			userId: user.identityProviderId,
			apiKeyId: apiKey.id,
			provider: "anthropic",
			inputTokens: 1,
			outputTokens: 1,
			costCents: 0.01,
			mode: "managed",
		};

		const res = await reportUsage(
			[
				{ ...base, model: "served", occurredAt: "2026-11-13T23:59:58.500Z" },
				{ ...base, model: "future", occurredAt: "2099-01-01T00:00:00.000Z" },
				{ ...base, model: "garbled", occurredAt: "yesterday" },
			],
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.apiKeyId, apiKey.id));
		const createdAt = (model: string) =>
			new Date(rows.find((row) => row.model === model)?.createdAt ?? 0);

		expect(createdAt("served").toISOString()).toBe("2026-11-13T23:59:58.500Z");
		const now = Date.now();
		for (const model of ["future", "garbled"]) {
			expect(Math.abs(createdAt(model).getTime() - now)).toBeLessThan(60_000);
		}
	});

	// One unattributable event used to fail the whole batch on a foreign key
	// error, losing every other event in it
	test("skips events it cannot attribute without failing the batch", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const base = {
			provider: "anthropic",
			model: "claude-haiku-5-5",
			inputTokens: 1,
			outputTokens: 1,
			costCents: 0.01,
			mode: "managed",
		};

		const res = await reportUsage(
			[
				{ ...base, userId: user.identityProviderId, apiKeyId: apiKey.id },
				{ ...base, userId: user.identityProviderId, apiKeyId: randomUUID() },
				{ ...base, userId: randomUUID(), apiKeyId: apiKey.id },
				{ ...base, userId: "not-a-uuid", apiKeyId: "not-a-uuid" },
			],
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ recorded: 1, skipped: 3 });

		const rows = await ctx.db
			.select()
			.from(usageEventTable)
			.where(eq(usageEventTable.userId, user.id));
		expect(rows).toHaveLength(1);
	});
});
