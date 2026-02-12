import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
// GATEWAY_SECRET is set in .env.test (loaded before preload triggers env.config evaluation)
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import { encrypt, generateApiKey } from "lib/crypto";
import resolveKeyRoute from "lib/routes/resolveKey";
import { apiKeyFactory, providerKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

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
		const res = await resolveKey("sk-syn-fake");
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("returns 401 when gateway secret is wrong", async () => {
		const res = await resolveKey("sk-syn-fake", "wrong-secret");
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
		expect(body.userId).toBe(user.id);
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
		const res = await resolveKey("sk-syn-nonexistent", GATEWAY_SECRET);
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
});
