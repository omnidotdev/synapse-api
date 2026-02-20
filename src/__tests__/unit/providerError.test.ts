import { randomBytes } from "node:crypto";

// Must set ENCRYPTION_KEY before any crypto module is loaded
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.GATEWAY_SECRET ??= "test-gateway-secret";

import { describe, expect, mock, test } from "bun:test";

// Mock the publisher before importing the route so the route picks up the mock
const mockPublish = mock(async () => null);

mock.module("lib/events/publisher", () => ({
	publish: mockPublish,
	initPublisher: mock(async () => {}),
	closePublisher: mock(() => {}),
}));

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
	test("publishes synapse.provider.error when key decryption fails", async () => {
		mockPublish.mockClear();

		// Create a user and a provider key with invalid ciphertext so decrypt() throws
		const user = await userFactory.create(ctx.db);

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			// Deliberately invalid ciphertext — decrypt() will throw
			encryptedKey: "not-valid-encrypted-data",
			keyHint: "xxxx",
		});

		const res = await resolveProviderKeys(user.identityProviderId, GATEWAY_SECRET);
		expect(res.status).toBe(500);

		const body = await res.json();
		expect(body.error).toBe("key_decryption_failed");

		// Allow microtasks to flush
		await new Promise((r) => setTimeout(r, 0));

		expect(mockPublish).toHaveBeenCalledTimes(1);

		const calls = mockPublish.mock.calls as unknown as [unknown][];
		const event = calls[0][0] as Record<string, unknown>;

		expect(event.type).toBe("synapse.provider.error");
		expect(event.source).toBe("synapse-api");
		expect(event.organizationId).toBe(user.identityProviderId);
		expect(event.subject).toBe(user.identityProviderId);

		const data = event.data as Record<string, unknown>;
		expect(data.userId).toBe(user.identityProviderId);
		expect(typeof data.errorCode).toBe("string");
		expect(typeof data.message).toBe("string");
	});

	test("does not publish provider error event on successful key resolution", async () => {
		mockPublish.mockClear();

		const user = await userFactory.create(ctx.db);

		await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
			encryptedKey: encrypt("sk-ant-valid-key"),
			keyHint: "-key",
		});

		const res = await resolveProviderKeys(user.identityProviderId, GATEWAY_SECRET);
		expect(res.status).toBe(200);

		await new Promise((r) => setTimeout(r, 0));

		expect(mockPublish).not.toHaveBeenCalled();
	});
});
