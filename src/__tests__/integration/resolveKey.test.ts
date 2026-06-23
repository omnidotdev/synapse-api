import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
// GATEWAY_SECRET is set in .env.test (loaded before preload triggers env.config evaluation)
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, spyOn, test } from "bun:test";
import { Elysia } from "elysia";

import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import { encrypt, generateApiKey } from "lib/crypto";
import { apiKeyProviderTable, usageEventTable } from "lib/db/schema";
import { billing } from "lib/providers";
import resolveKeyRoute from "lib/routes/resolveKey";
import { apiKeyFactory, providerKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

const GATEWAY_SECRET = "test-gateway-secret";

const app = new Elysia().use(resolveKeyRoute);

/** Send a resolve-key request with the given API key and optional gateway secret */
const resolveKey = (key: string, secret?: string) =>
	app.handle(
		new Request("http://test/internal/resolve-key", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(secret !== undefined ? { "x-gateway-secret": secret } : {}),
			},
			body: JSON.stringify({ key }),
		}),
	);

const ctx = setupTestContext();

describe("POST /internal/resolve-key", () => {
	test("returns 401 when gateway secret is missing", async () => {
		const res = await resolveKey("synapse_fake");
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("returns 401 when gateway secret is wrong", async () => {
		const res = await resolveKey("synapse_fake", "wrong-secret");
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("returns full context for valid BYOK key", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		const rawProviderKey = "sk-ant-test-provider-key-12345";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawProviderKey),
			keyHint: rawProviderKey.slice(-4),
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.userId).toBe(user.identityProviderId);
		expect(body.workspaceId).toBe(apiKey.workspaceId);
		expect(body.apiKeyId).toBe(apiKey.id);
		expect(body.mode).toBe("byok");
		expect(body.plan).toBe("free");
		expect(body.rateLimits).toEqual(PLAN_RATE_LIMITS.free);
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("anthropic");
		expect(body.providerKeys[0].decryptedKey).toBe(rawProviderKey);
	});

	test("returns invalid_key for unknown key", async () => {
		const res = await resolveKey("synapse_nonexistent", GATEWAY_SECRET);
		expect(res.status).toBe(404);

		const body = await res.json();
		expect(body.error).toBe("invalid_key");
	});

	test("returns expired_key for expired key", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(404);

		const body = await res.json();
		expect(body.error).toBe("expired_key");
	});

	test("returns invalid_key for revoked key", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			revokedAt: new Date().toISOString(),
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(404);

		const body = await res.json();
		expect(body.error).toBe("invalid_key");
	});

	test("returns empty providerKeys for managed mode", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "managed",
		});

		// Provider key exists but should not appear for managed mode
		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "openai",
			encryptedKey: encrypt("sk-test-managed-key"),
			keyHint: "-key",
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.mode).toBe("managed");
		expect(body.providerKeys).toEqual([]);
	});

	test("returns plan-appropriate rateLimits", async () => {
		const user = await userFactory.create(ctx.db, { plan: "pro" });
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.plan).toBe("pro");
		expect(body.rateLimits).toEqual(PLAN_RATE_LIMITS.pro);
	});

	test("returns 403 when BYOK key has byok_enabled entitlement set to 0", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		const rawProviderKey = "sk-ant-test-byok-blocked";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawProviderKey),
			keyHint: rawProviderKey.slice(-4),
		});

		// Mock billing to return byok_enabled = 0
		const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "free" },
				{ featureKey: "byok_enabled", value: 0 },
			],
		} as unknown as EntitlementsResponse);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toBe("byok_not_enabled");

		getEntitlementsSpy.mockRestore();
	});

	test("allows BYOK key when byok_enabled entitlement is 1", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		const rawProviderKey = "sk-ant-test-byok-allowed";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawProviderKey),
			keyHint: rawProviderKey.slice(-4),
		});

		// Mock billing to return byok_enabled = 1
		const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "free" },
				{ featureKey: "byok_enabled", value: 1 },
			],
		} as unknown as EntitlementsResponse);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.mode).toBe("byok");
		expect(body.providerKeys).toHaveLength(1);

		getEntitlementsSpy.mockRestore();
	});

	test("returns per-key linked provider keys for manual mode", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "manual",
		});

		const rawProviderKey = "sk-ant-test-linked-key-12345";

		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawProviderKey),
			keyHint: rawProviderKey.slice(-4),
		});

		// Link provider key to API key via junction table
		await ctx.db.insert(apiKeyProviderTable).values({
			apiKeyId: apiKey.id,
			providerKeyId: providerKey.id,
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.mode).toBe("manual");
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("anthropic");
		expect(body.providerKeys[0].decryptedKey).toBe(rawProviderKey);
	});

	test("per-key links take precedence over BYOK account-level keys", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		// Account-level BYOK key (should be overridden)
		const accountKey = "sk-ant-account-level-key";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(accountKey),
			keyHint: accountKey.slice(-4),
		});

		// Per-key linked provider key (should take precedence)
		const linkedKey = "sk-ant-per-key-linked-key";

		const perKeyProvider = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "openai",
			encryptedKey: encrypt(linkedKey),
			keyHint: linkedKey.slice(-4),
		});

		await ctx.db.insert(apiKeyProviderTable).values({
			apiKeyId: apiKey.id,
			providerKeyId: perKeyProvider.id,
		});

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		// Per-key link should override account-level BYOK keys
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("openai");
		expect(body.providerKeys[0].decryptedKey).toBe(linkedKey);
	});

	test("returns 403 when managed key has managed_keys_enabled entitlement set to 0", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "managed",
		});

		const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "free" },
				{ featureKey: "managed_keys_enabled", value: 0 },
			],
		} as unknown as EntitlementsResponse);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toBe("managed_keys_not_enabled");

		getEntitlementsSpy.mockRestore();
	});

	test("allows managed key when managed_keys_enabled entitlement is 1", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "managed",
		});

		const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "pro" },
				{ featureKey: "managed_keys_enabled", value: 1 },
			],
		} as unknown as EntitlementsResponse);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.mode).toBe("managed");

		getEntitlementsSpy.mockRestore();
	});

	/** Seed `count` usage events for a user/api key in the current month */
	const seedUsageEvents = async (
		userId: string,
		apiKeyId: string,
		count: number,
	) => {
		if (count === 0) return;

		// Insert in chunks to stay under Postgres's bind-parameter limit (65,535);
		// each row carries 8 non-default columns, so 2,000 rows == 16,000 params
		const chunkSize = 2_000;

		for (let inserted = 0; inserted < count; inserted += chunkSize) {
			const batch = Math.min(chunkSize, count - inserted);

			await ctx.db.insert(usageEventTable).values(
				Array.from({ length: batch }, () => ({
					userId,
					apiKeyId,
					provider: "anthropic",
					model: "claude-3-5-sonnet",
					inputTokens: 10,
					outputTokens: 10,
					costCents: 1,
					mode: "byok",
				})),
			);
		}
	};

	test("rejects with 429 when free tier monthly request limit is exceeded", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		// Free tier hard cap is 10,000 requests/month (no overage). Seed at the cap
		// to exercise the count path (chunked to respect the bind-parameter limit)
		await seedUsageEvents(user.id, apiKey.id, 10_000);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(429);

		const body = await res.json();
		expect(body.error).toBe("monthly_request_limit_exceeded");
		expect(body.limit).toBe(10_000);
		expect(body.current).toBe(10_000);
	});

	test("allows free tier when under the monthly request limit", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		await seedUsageEvents(user.id, apiKey.id, 5);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);
	});

	test("allows over-limit requests when tier permits overage", async () => {
		const user = await userFactory.create(ctx.db, { plan: "pro" });
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		// Pro tier permits overage (overage_rate_per_1k = 20), so being over the
		// 100,000 limit must NOT block; mock entitlements to assert the overage path
		// without seeding 100k rows
		const getEntitlementsSpy = spyOn(
			billing,
			"getEntitlements",
		).mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "pro" },
				{ featureKey: "max_requests_per_month", value: 1 },
				{ featureKey: "overage_rate_per_1k", value: 20 },
			],
		} as unknown as EntitlementsResponse);

		// Two events puts the user over the mocked limit of 1
		await seedUsageEvents(user.id, apiKey.id, 2);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		getEntitlementsSpy.mockRestore();
	});

	test("rejects over-limit requests when tier has no overage", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		// Entitlement caps at 1 request/month with no overage -> hard cap
		const getEntitlementsSpy = spyOn(
			billing,
			"getEntitlements",
		).mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "free" },
				{ featureKey: "max_requests_per_month", value: 1 },
				{ featureKey: "overage_rate_per_1k", value: 0 },
			],
		} as unknown as EntitlementsResponse);

		await seedUsageEvents(user.id, apiKey.id, 2);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(429);

		const body = await res.json();
		expect(body.error).toBe("monthly_request_limit_exceeded");

		getEntitlementsSpy.mockRestore();
	});

	test("allows team tier (unlimited requests) regardless of usage", async () => {
		const user = await userFactory.create(ctx.db, { plan: "team" });
		const { raw, hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		const getEntitlementsSpy = spyOn(
			billing,
			"getEntitlements",
		).mockResolvedValue({
			entitlements: [
				{ featureKey: "tier", value: "team" },
				{ featureKey: "max_requests_per_month", value: -1 },
			],
		} as unknown as EntitlementsResponse);

		await seedUsageEvents(user.id, apiKey.id, 50);

		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.plan).toBe("team");

		getEntitlementsSpy.mockRestore();
	});

	test("allows BYOK key when byok_enabled entitlement is absent", async () => {
		const user = await userFactory.create(ctx.db);
		const { raw, hash, hint } = generateApiKey();

		await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			mode: "byok",
		});

		const rawProviderKey = "sk-ant-test-byok-no-entitlement";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawProviderKey),
			keyHint: rawProviderKey.slice(-4),
		});

		// Noop provider returns null (no entitlements configured)
		// so byok_enabled is absent - should be allowed
		const res = await resolveKey(raw, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.mode).toBe("byok");
		expect(body.providerKeys).toHaveLength(1);
	});
});
