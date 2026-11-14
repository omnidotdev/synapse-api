import { describe, expect, test } from "bun:test";
import { HttpResponse, http } from "msw";

import { aetherAccess } from "lib/billing/apiAccess";
import { mswServer } from "test/setup/mswServer";

const AETHER = "https://aether.test";
const config = { baseUrl: AETHER, serviceApiKey: "svc-key" };
const ORG = "6f1c2b9e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
const CHECK_URL = `${AETHER}/entitlements/facet/organization/${ORG}/api_access/check`;

const check = () =>
	aetherAccess.checkApiAccess("facet", "organization", ORG, config);

describe("checkApiAccess", () => {
	test("calls Aether's value-aware check route with the service key", async () => {
		const seen: { key: string | null } = { key: null };
		mswServer.use(
			http.get(CHECK_URL, ({ request }) => {
				seen.key = request.headers.get("x-service-api-key");
				return HttpResponse.json({ hasEntitlement: true, value: 1, version: 1 });
			}),
		);

		expect(await check()).toBe("granted");
		expect(seen.key).toBe("svc-key");
	});

	test("is denied when Aether does not grant the feature", async () => {
		mswServer.use(
			http.get(CHECK_URL, () =>
				HttpResponse.json({ hasEntitlement: false, value: 0, version: 1 }),
			),
		);

		expect(await check()).toBe("denied");
	});

	test("is unavailable when Aether errors", async () => {
		mswServer.use(
			http.get(CHECK_URL, () => new HttpResponse(null, { status: 503 })),
		);

		expect(await check()).toBe("unavailable");
	});

	test("is unavailable when Aether rejects the service key", async () => {
		mswServer.use(
			http.get(CHECK_URL, () => new HttpResponse(null, { status: 401 })),
		);

		expect(await check()).toBe("unavailable");
	});

	test("is unavailable when the network fails", async () => {
		mswServer.use(http.get(CHECK_URL, () => HttpResponse.error()));

		expect(await check()).toBe("unavailable");
	});

	test("is unavailable when billing is not configured", async () => {
		expect(
			await aetherAccess.checkApiAccess("facet", "organization", ORG, {
				baseUrl: undefined,
				serviceApiKey: undefined,
			}),
		).toBe("unavailable");
	});
});
