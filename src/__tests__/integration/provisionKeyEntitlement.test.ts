import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import { Elysia } from "elysia";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";
import provisionKeyRoute from "lib/routes/provisionKey";
import { userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const GATEWAY_SECRET = "test-gateway-secret";

const app = new Elysia().use(provisionKeyRoute);

/** Send a provision-key request */
const provisionKey = (
	body: {
		identityProviderId: string;
		email?: string;
		name?: string;
		source?: string;
		appId?: string;
		billingEntity?: { entityType: string; entityId: string };
	},
	secret?: string,
) =>
	app.handle(
		new Request("http://test/internal/provision-managed-key", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(secret !== undefined ? { "x-gateway-secret": secret } : {}),
			},
			body: JSON.stringify(body),
		}),
	);

const ctx = setupTestContext();

describe("POST /internal/provision-managed-key", () => {
	test("returns 401 when gateway secret is missing", async () => {
		const res = await provisionKey({
			identityProviderId: "idp-test-auth",
		});
		expect(res.status).toBe(401);
	});

	test("returns 401 when gateway secret is wrong", async () => {
		const res = await provisionKey(
			{ identityProviderId: "idp-test" },
			"wrong-secret",
		);
		expect(res.status).toBe(401);
	});

	test("returns a clean 400 for a non-UUID id (no raw DB-error leak)", async () => {
		const res = await provisionKey(
			{ identityProviderId: "not-a-uuid" },
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("identityProviderId must be a UUID");
		// the raw DB error must never reach the caller
		expect(JSON.stringify(body)).not.toContain("insert into");
	});

	test("managed key provisioning succeeds for existing user", async () => {
		const user = await userFactory.create(ctx.db);

		const res = await provisionKey(
			{ identityProviderId: user.identityProviderId },
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.apiKey).toMatch(/^synapse_/);
		expect(body.keyHint).toBeDefined();
		expect(body.userId).toBe(user.id);
		expect(body.plan).toBe("free");
	});

	test("managed key provisioning is independent of byok key count", async () => {
		// Create a user with an existing byok key (at the free limit of 1)
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();

		await ctx.db.insert(apiKeyTable).values({
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			name: "My BYOK Key",
			mode: "byok",
		});

		// Managed key provisioning should succeed regardless of byok key count
		// because managed keys are system-provisioned and independent of user quota
		const res = await provisionKey(
			{ identityProviderId: user.identityProviderId },
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.apiKey).toMatch(/^synapse_/);
	});

	test("rotates existing managed key on repeat provisioning", async () => {
		const user = await userFactory.create(ctx.db);

		const first = await provisionKey(
			{ identityProviderId: user.identityProviderId },
			GATEWAY_SECRET,
		);
		expect(first.status).toBe(200);
		const firstBody = await first.json();

		const second = await provisionKey(
			{ identityProviderId: user.identityProviderId },
			GATEWAY_SECRET,
		);
		expect(second.status).toBe(200);
		const secondBody = await second.json();

		// Should return a different key (rotated)
		expect(secondBody.apiKey).not.toBe(firstBody.apiKey);
		// Same user
		expect(secondBody.userId).toBe(firstBody.userId);
	});
});

describe("POST /internal/provision-managed-key (product-scoped)", () => {
	const activeManagedKeys = (userId: string) =>
		ctx.db
			.select()
			.from(apiKeyTable)
			.where(
				and(
					eq(apiKeyTable.userId, userId),
					eq(apiKeyTable.mode, "managed"),
					isNull(apiKeyTable.revokedAt),
				),
			);

	test("stores the product and billing entity on the key", async () => {
		const user = await userFactory.create(ctx.db);
		const entityId = crypto.randomUUID();

		const res = await provisionKey(
			{
				identityProviderId: user.identityProviderId,
				source: "Facet",
				appId: "facet",
				billingEntity: { entityType: "user", entityId },
			},
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const [key] = await activeManagedKeys(user.id);
		expect(key?.appId).toBe("facet");
		expect(key?.billingEntityType).toBe("user");
		expect(key?.billingEntityId).toBe(entityId);
	});

	test("bills the user themselves when no entity is given", async () => {
		const user = await userFactory.create(ctx.db);

		const res = await provisionKey(
			{
				identityProviderId: user.identityProviderId,
				appId: "facet",
			},
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const [key] = await activeManagedKeys(user.id);
		expect(key?.appId).toBe("facet");
		expect(key?.billingEntityType).toBe("user");
		expect(key?.billingEntityId).toBe(user.identityProviderId);
	});

	test("keeps one key per product and rotates only that product's key", async () => {
		const user = await userFactory.create(ctx.db);
		const id = user.identityProviderId;

		const synapseKey = await (
			await provisionKey({ identityProviderId: id }, GATEWAY_SECRET)
		).json();
		const facetKey = await (
			await provisionKey({ identityProviderId: id, appId: "facet" }, GATEWAY_SECRET)
		).json();
		const facetRotated = await (
			await provisionKey({ identityProviderId: id, appId: "facet" }, GATEWAY_SECRET)
		).json();

		expect(facetKey.apiKey).not.toBe(synapseKey.apiKey);
		expect(facetRotated.apiKey).not.toBe(facetKey.apiKey);

		const keys = await activeManagedKeys(user.id);
		expect(keys).toHaveLength(2);
		expect(keys.map((k) => k.appId).sort()).toEqual(["facet", null].sort());
	});

	test.each([
		["path traversal", "../credits"],
		["a slash", "facet/x"],
		["uppercase", "Facet"],
		["empty", ""],
	])("rejects an appId containing %s", async (_label, appId) => {
		const user = await userFactory.create(ctx.db);

		const res = await provisionKey(
			{ identityProviderId: user.identityProviderId, appId },
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(400);
		expect(await activeManagedKeys(user.id)).toHaveLength(0);
	});

	test("rejects an unsupported billing entity", async () => {
		const user = await userFactory.create(ctx.db);

		const badType = await provisionKey(
			{
				identityProviderId: user.identityProviderId,
				appId: "facet",
				billingEntity: { entityType: "team", entityId: crypto.randomUUID() },
			},
			GATEWAY_SECRET,
		);
		expect(badType.status).toBe(400);

		const badId = await provisionKey(
			{
				identityProviderId: user.identityProviderId,
				appId: "facet",
				billingEntity: { entityType: "user", entityId: "../x" },
			},
			GATEWAY_SECRET,
		);
		expect(badId.status).toBe(400);

		const entityWithoutApp = await provisionKey(
			{
				identityProviderId: user.identityProviderId,
				billingEntity: { entityType: "user", entityId: crypto.randomUUID() },
			},
			GATEWAY_SECRET,
		);
		expect(entityWithoutApp.status).toBe(400);
	});
});
