import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import billingWebhook from "lib/providers/billing/webhooks";
import { userTable } from "lib/db/schema";
import { userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const WEBHOOK_SECRET = "test-billing-secret";

const app = new Elysia({ prefix: "/webhooks" }).use(billingWebhook);

const signPayload = (payload: string) =>
	createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

const sendWebhook = (body: Record<string, unknown>, signature?: string) => {
	const raw = JSON.stringify(body);

	return app.handle(
		new Request("http://test/webhooks/billing", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(signature !== undefined
					? { "x-billing-signature": signature }
					: {}),
			},
			body: raw,
		}),
	);
};

const ctx = setupTestContext();

describe("POST /webhooks/billing", () => {
	test("rejects request with missing signature", async () => {
		const res = await sendWebhook({ eventType: "entitlement.created" });
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("Missing signature");
	});

	test("rejects request with invalid signature", async () => {
		const payload = JSON.stringify({ eventType: "entitlement.created" });

		const res = await app.handle(
			new Request("http://test/webhooks/billing", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": "bad-signature",
				},
				body: payload,
			}),
		);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("Invalid signature");
	});

	test("accepts valid signature and returns 200", async () => {
		const payload = JSON.stringify({
			eventType: "entitlement.created",
			entityType: "user",
			entityId: "test-entity",
			productId: "synapse",
			featureKey: "max_api_keys",
			value: 25,
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/billing", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.received).toBe(true);
	});

	test("syncs user.plan when tier entitlement changes", async () => {
		const user = await userFactory.create(ctx.db, { plan: "free" });

		const payload = JSON.stringify({
			eventType: "entitlement.updated",
			entityType: "user",
			entityId: user.identityProviderId,
			productId: "synapse",
			featureKey: "tier",
			value: "pro",
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/billing", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);

		// Wait for the async DB update (fire-and-forget)
		await new Promise((resolve) => setTimeout(resolve, 100));

		const [updated] = await ctx.db
			.select({ plan: userTable.plan })
			.from(userTable)
			.where(eq(userTable.identityProviderId, user.identityProviderId));

		expect(updated.plan).toBe("pro");
	});

	test("does not sync user.plan on entitlement.deleted", async () => {
		const user = await userFactory.create(ctx.db, { plan: "pro" });

		const payload = JSON.stringify({
			eventType: "entitlement.deleted",
			entityType: "user",
			entityId: user.identityProviderId,
			productId: "synapse",
			featureKey: "tier",
			value: "free",
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/billing", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);

		await new Promise((resolve) => setTimeout(resolve, 100));

		const [unchanged] = await ctx.db
			.select({ plan: userTable.plan })
			.from(userTable)
			.where(eq(userTable.identityProviderId, user.identityProviderId));

		// Plan should remain pro since deleted events don't sync
		expect(unchanged.plan).toBe("pro");
	});

	test("accepts requests on /webhooks/entitlements alias", async () => {
		const payload = JSON.stringify({
			eventType: "entitlement.created",
			entityType: "user",
			entityId: "test-entity-alias",
			productId: "synapse",
			featureKey: "max_api_keys",
			value: 25,
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/entitlements", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.received).toBe(true);
	});

	test("rejects missing signature on /webhooks/entitlements alias", async () => {
		const res = await app.handle(
			new Request("http://test/webhooks/entitlements", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ eventType: "entitlement.created" }),
			}),
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("Missing signature");
	});

	test("syncs user.plan via /webhooks/entitlements alias", async () => {
		const user = await userFactory.create(ctx.db, { plan: "free" });

		const payload = JSON.stringify({
			eventType: "entitlement.updated",
			entityType: "user",
			entityId: user.identityProviderId,
			productId: "synapse",
			featureKey: "tier",
			value: "pro",
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/entitlements", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);

		// Wait for the async DB update (fire-and-forget)
		await new Promise((resolve) => setTimeout(resolve, 100));

		const [updated] = await ctx.db
			.select({ plan: userTable.plan })
			.from(userTable)
			.where(eq(userTable.identityProviderId, user.identityProviderId));

		expect(updated.plan).toBe("pro");
	});

	test("ignores non-tier feature keys", async () => {
		const user = await userFactory.create(ctx.db, { plan: "free" });

		const payload = JSON.stringify({
			eventType: "entitlement.updated",
			entityType: "user",
			entityId: user.identityProviderId,
			productId: "synapse",
			featureKey: "max_api_keys",
			value: 25,
			version: 1,
			timestamp: new Date().toISOString(),
		});

		const res = await app.handle(
			new Request("http://test/webhooks/billing", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-billing-signature": signPayload(payload),
				},
				body: payload,
			}),
		);

		expect(res.status).toBe(200);

		await new Promise((resolve) => setTimeout(resolve, 100));

		const [unchanged] = await ctx.db
			.select({ plan: userTable.plan })
			.from(userTable)
			.where(eq(userTable.identityProviderId, user.identityProviderId));

		expect(unchanged.plan).toBe("free");
	});
});
