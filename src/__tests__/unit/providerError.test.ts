import { randomBytes } from "node:crypto";

// Must set ENCRYPTION_KEY before any crypto module is loaded
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.GATEWAY_SECRET ??= "test-gateway-secret";

import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { encrypt } from "lib/crypto";
import resolveProviderKeysRoute from "lib/routes/resolveProviderKeys";
import { providerKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const GATEWAY_SECRET = process.env.GATEWAY_SECRET ?? "test-gateway-secret";

const app = new Elysia().use(resolveProviderKeysRoute);

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

describe("resolveProviderKeys - provider error events", () => {
	test("skips keys that fail to decrypt and resolves the rest", async () => {
		// A user with one valid key and one key whose ciphertext is invalid.
		// The undecryptable key must be skipped (logged) without failing the
		// whole request, so the remaining valid key still resolves.
		const user = await userFactory.create(ctx.db);

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt("sk-ant-valid-key"),
			keyHint: "-key",
		});

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "openai",
			// Deliberately invalid ciphertext, decrypt() will throw
			encryptedKey: "not-valid-encrypted-data",
			keyHint: "xxxx",
		});

		const res = await resolveProviderKeys(user.identityProviderId, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		// Only the decryptable key is returned; the bad one is silently skipped
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("anthropic");
		expect(body.providerKeys[0].decryptedKey).toBe("sk-ant-valid-key");
	});

	test("does not error on successful key resolution", async () => {
		const user = await userFactory.create(ctx.db);

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt("sk-ant-valid-key"),
			keyHint: "-key",
		});

		const res = await resolveProviderKeys(user.identityProviderId, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.providerKeys).toHaveLength(1);
		expect(body.providerKeys[0].provider).toBe("anthropic");
		expect(body.providerKeys[0].decryptedKey).toBe("sk-ant-valid-key");
	});
});
