import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, spyOn, test } from "bun:test";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { Elysia } from "elysia";

import { aetherAccess } from "lib/billing/apiAccess";
import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";
import provisionKeyRoute from "lib/routes/provisionKey";
import resolveKeyRoute from "lib/routes/resolveKey";
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

		// One current key per product; the rotated-out Facet key is only in its
		// grace window
		const keys = (await activeManagedKeys(user.id)).filter(
			(k) => k.expiresAt === null,
		);
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

describe("POST /internal/provision-managed-key (key per billing entity)", () => {
	const resolveApp = new Elysia().use(resolveKeyRoute);

	/** Whether the gateway can still resolve a raw key */
	const resolves = async (key: string) =>
		(
			await resolveApp.handle(
				new Request("http://test/internal/resolve-key", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-gateway-secret": GATEWAY_SECRET,
					},
					body: JSON.stringify({ key }),
				}),
			)
		).status === 200;

	const provisionFor = async (
		identityProviderId: string,
		entityId: string,
		entityType = "organization",
	) => {
		const res = await provisionKey(
			{
				identityProviderId,
				source: "Facet",
				appId: "facet",
				billingEntity: { entityType, entityId },
			},
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);
		return (await res.json()) as { apiKey: string };
	};

	const keyRows = (userId: string) =>
		ctx.db
			.select()
			.from(apiKeyTable)
			.where(and(eq(apiKeyTable.userId, userId), eq(apiKeyTable.mode, "managed")));

	test("a user in two organizations gets independent keys", async () => {
		const user = await userFactory.create(ctx.db);
		const orgA = crypto.randomUUID();
		const orgB = crypto.randomUUID();

		const keyA = await provisionFor(user.identityProviderId, orgA);
		const keyB = await provisionFor(user.identityProviderId, orgB);

		expect(keyB.apiKey).not.toBe(keyA.apiKey);
		// Provisioning org B never revokes, rotates, or re-points org A's key
		expect(await resolves(keyA.apiKey)).toBe(true);
		expect(await resolves(keyB.apiKey)).toBe(true);

		const rows = await keyRows(user.id);
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.billingEntityId).sort()).toEqual([orgA, orgB].sort());
		expect(rows.every((r) => r.expiresAt === null && r.revokedAt === null)).toBe(
			true,
		);
	});

	test("re-provisioning the same entity rotates, keeping the old key for a grace window", async () => {
		const user = await userFactory.create(ctx.db);
		const org = crypto.randomUUID();

		const first = await provisionFor(user.identityProviderId, org);
		const startedAt = Date.now();
		const second = await provisionFor(user.identityProviderId, org);

		expect(second.apiKey).not.toBe(first.apiKey);
		expect(await resolves(second.apiKey)).toBe(true);
		// A replica that cached the first key a moment ago keeps working
		expect(await resolves(first.apiKey)).toBe(true);

		const rows = await keyRows(user.id);
		const current = rows.filter((r) => r.expiresAt === null);
		const retiring = rows.filter((r) => r.expiresAt !== null);
		expect(current).toHaveLength(1);
		expect(retiring).toHaveLength(1);

		// The grace window is 10 minutes from the rotation
		const graceMs = new Date(retiring[0]!.expiresAt!).getTime() - startedAt;
		expect(graceMs).toBeGreaterThan(9 * 60_000);
		expect(graceMs).toBeLessThanOrEqual(10 * 60_000 + 5_000);

		// Once the window passes, the old key stops resolving
		await ctx.db
			.update(apiKeyTable)
			.set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
			.where(eq(apiKeyTable.id, retiring[0]!.id));
		expect(await resolves(first.apiKey)).toBe(false);
		expect(await resolves(second.apiKey)).toBe(true);
	});

	test("every key rotated within the grace window resolves until it lapses", async () => {
		const user = await userFactory.create(ctx.db);
		const org = crypto.randomUUID();

		const keys: string[] = [];
		for (let i = 0; i < 3; i++) {
			keys.push((await provisionFor(user.identityProviderId, org)).apiKey);
		}

		// Several replicas rotating in quick succession invalidate nobody
		for (const key of keys) expect(await resolves(key)).toBe(true);

		// Once their windows lapse, the next rotation retires them for good
		await ctx.db
			.update(apiKeyTable)
			.set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
			.where(
				and(eq(apiKeyTable.userId, user.id), isNotNull(apiKeyTable.expiresAt)),
			);
		const latest = (await provisionFor(user.identityProviderId, org)).apiKey;

		const live = (await keyRows(user.id)).filter((r) => r.revokedAt === null);
		// The key just rotated out (in its window) plus the new current key
		expect(live).toHaveLength(2);
		expect(await resolves(latest)).toBe(true);
		expect(await resolves(keys[2]!)).toBe(true);
		expect(await resolves(keys[0]!)).toBe(false);
		expect(await resolves(keys[1]!)).toBe(false);
	});

	test("concurrent provisioning of one entity leaves exactly one current key", async () => {
		const user = await userFactory.create(ctx.db);
		const org = crypto.randomUUID();

		const results = await Promise.all(
			Array.from({ length: 4 }, () =>
				provisionKey(
					{
						identityProviderId: user.identityProviderId,
						source: "Facet",
						appId: "facet",
						billingEntity: { entityType: "organization", entityId: org },
					},
					GATEWAY_SECRET,
				),
			),
		);

		expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
		const current = (await keyRows(user.id)).filter(
			(r) => r.revokedAt === null && r.expiresAt === null,
		);
		expect(current).toHaveLength(1);
	});

	test("the database refuses a second current key for one entity", async () => {
		const user = await userFactory.create(ctx.db);
		const org = crypto.randomUUID();
		await provisionFor(user.identityProviderId, org);
		const { hash, hint } = generateApiKey();

		await expect(
			ctx.db.insert(apiKeyTable).values({
				userId: user.id,
				keyHash: hash,
				keyHint: hint,
				name: "Facet (auto)",
				mode: "managed",
				appId: "facet",
				billingEntityType: "organization",
				billingEntityId: org,
			}).execute(),
		).rejects.toThrow();
	});

	test("a direct key and a product key never collide", async () => {
		const user = await userFactory.create(ctx.db);
		const id = user.identityProviderId;

		const direct = await (
			await provisionKey({ identityProviderId: id, source: "Facet" }, GATEWAY_SECRET)
		).json();
		const product = await provisionFor(id, id, "user");

		expect(await resolves(direct.apiKey)).toBe(true);
		expect(await resolves(product.apiKey)).toBe(true);
	});
});

describe("POST /internal/provision-managed-key (api_access)", () => {
	const scoped = (identityProviderId: string, entityId: string) => ({
		identityProviderId,
		source: "Facet",
		appId: "facet",
		billingEntity: { entityType: "organization", entityId },
	});

	test("checks api_access against the product and entity the key bills", async () => {
		const user = await userFactory.create(ctx.db);
		const org = crypto.randomUUID();
		const spy = spyOn(aetherAccess, "checkApiAccess").mockResolvedValue("granted");

		const res = await provisionKey(scoped(user.identityProviderId, org), GATEWAY_SECRET);

		expect(res.status).toBe(200);
		expect(spy).toHaveBeenCalledWith("facet", "organization", org);
		spy.mockRestore();
	});

	test("checks a direct key against the user's own Synapse account", async () => {
		const user = await userFactory.create(ctx.db);
		const spy = spyOn(aetherAccess, "checkApiAccess").mockResolvedValue("granted");

		const res = await provisionKey(
			{ identityProviderId: user.identityProviderId },
			GATEWAY_SECRET,
		);

		expect(res.status).toBe(200);
		expect(spy).toHaveBeenCalledWith("synapse", "user", user.identityProviderId);
		spy.mockRestore();
	});

	test("denies and mints nothing when api_access is not granted", async () => {
		const user = await userFactory.create(ctx.db);
		const spy = spyOn(aetherAccess, "checkApiAccess").mockResolvedValue("denied");

		const res = await provisionKey(
			scoped(user.identityProviderId, crypto.randomUUID()),
			GATEWAY_SECRET,
		);

		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe("api_access entitlement denied");
		const keys = await ctx.db
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.userId, user.id));
		expect(keys).toHaveLength(0);
		spy.mockRestore();
	});

	test("still provisions when billing is unavailable (the gateway re-checks)", async () => {
		const user = await userFactory.create(ctx.db);
		const spy = spyOn(aetherAccess, "checkApiAccess").mockResolvedValue(
			"unavailable",
		);

		const res = await provisionKey(
			scoped(user.identityProviderId, crypto.randomUUID()),
			GATEWAY_SECRET,
		);

		expect(res.status).toBe(200);
		spy.mockRestore();
	});
});
