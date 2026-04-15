import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
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
