import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
// GATEWAY_SECRET is set in .env.test (loaded before preload triggers env.config evaluation)
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { encrypt } from "lib/crypto";
import resolveProviderKeysRoute from "lib/routes/resolveProviderKeys";
import { providerKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const GATEWAY_SECRET = process.env.GATEWAY_SECRET ?? "test-gateway-secret";

const app = new Elysia().use(resolveProviderKeysRoute);

/** Send a resolve-provider-keys request with the given identity provider ID and optional gateway secret */
const resolveProviderKeys = (identityProviderId: string, secret?: string) =>
	app.handle(
		new Request("http://test/internal/resolve-provider-keys", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(secret !== undefined ? { "x-gateway-secret": secret } : {}),
			},
			body: JSON.stringify({ identityProviderId }),
		}),
	);

const ctx = setupTestContext();

describe("POST /internal/resolve-provider-keys", () => {
	test("returns 401 when gateway secret is missing", async () => {
		const res = await resolveProviderKeys("00000000-0000-0000-0000-000000000000");
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("returns 401 when gateway secret is wrong", async () => {
		const res = await resolveProviderKeys(
			"00000000-0000-0000-0000-000000000000",
			"wrong-secret",
		);
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBe("unauthorized");
	});

	test("returns empty providerKeys for unknown identityProviderId", async () => {
		const res = await resolveProviderKeys(
			"00000000-0000-0000-0000-000000000000",
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.providerKeys).toEqual([]);
	});

	test("returns decrypted provider keys for a known user", async () => {
		const user = await userFactory.create(ctx.db);
		const rawKey = "sk-ant-test-provider-key-12345";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawKey),
			keyHint: rawKey.slice(-4),
		});

		const res = await resolveProviderKeys(
			user.identityProviderId,
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("anthropic");
		expect(body.providerKeys[0].decryptedKey).toBe(rawKey);
		expect(body.providerKeys[0].modelPreference).toBeNull();
	});

	test("returns modelPreference when set", async () => {
		const user = await userFactory.create(ctx.db);
		const rawKey = "sk-ant-test-provider-key-67890";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(rawKey),
			keyHint: rawKey.slice(-4),
			modelPreference: "claude-opus-4-6",
		});

		const res = await resolveProviderKeys(
			user.identityProviderId,
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].modelPreference).toBe("claude-opus-4-6");
	});

	test("returns all provider keys for a user with multiple providers", async () => {
		const user = await userFactory.create(ctx.db);
		const anthropicKey = "sk-ant-test-12345";
		const openaiKey = "sk-openai-test-67890";

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt(anthropicKey),
			keyHint: anthropicKey.slice(-4),
		});

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "openai",
			encryptedKey: encrypt(openaiKey),
			keyHint: openaiKey.slice(-4),
		});

		const res = await resolveProviderKeys(
			user.identityProviderId,
			GATEWAY_SECRET,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.providerKeys).toHaveLength(2);

		const providers = body.providerKeys.map(
			(k: { provider: string }) => k.provider,
		);
		expect(providers).toContain("anthropic");
		expect(providers).toContain("openai");
	});
});
