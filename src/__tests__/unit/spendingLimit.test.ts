import { afterEach, describe, expect, spyOn, test } from "bun:test";

import {
	SpendingLimitRejectedError,
	SpendingLimitUnavailableError,
	spendingLimits,
} from "lib/billing/spendingLimit";

const config = { baseUrl: "https://aether.test", serviceApiKey: "svc-key" };
const organizationId = "5234b07c-56b0-41f1-874a-07dcde0ccb9a";

const respond = (status: number, body?: unknown) =>
	spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(body === undefined ? null : JSON.stringify(body), { status }),
	);

let fetchSpy: ReturnType<typeof respond> | undefined;

afterEach(() => {
	fetchSpy?.mockRestore();
	fetchSpy = undefined;
});

describe("getSpendingLimit", () => {
	test("reads the workspace's Synapse limit with the service key", async () => {
		fetchSpy = respond(200, {
			hardLimitCents: 10_000,
			currentSpendCents: 2_500,
			suspended: false,
		});

		const limit = await spendingLimits.getSpendingLimit(organizationId, config);

		expect(limit).toEqual({
			organizationId,
			hardLimitCents: 10_000,
			currentSpendCents: 2_500,
			suspended: false,
		});
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(
			`https://aether.test/spending-limits/synapse/organization/${organizationId}`,
		);
		expect(init.headers).toEqual({ "x-service-api-key": "svc-key" });
	});

	test("a workspace without a billing account has no limit and no spend", async () => {
		fetchSpy = respond(404, { error: "not found" });

		expect(
			await spendingLimits.getSpendingLimit(organizationId, config),
		).toEqual({
			organizationId,
			hardLimitCents: null,
			currentSpendCents: 0,
			suspended: false,
		});
	});

	test("is unavailable when billing is not configured", async () => {
		await expect(
			spendingLimits.getSpendingLimit(organizationId, {
				baseUrl: undefined,
				serviceApiKey: undefined,
			}),
		).rejects.toBeInstanceOf(SpendingLimitUnavailableError);
	});
});

describe("setHardLimit", () => {
	test("writes only the hard limit", async () => {
		fetchSpy = respond(200, {
			hardLimitCents: 25_000,
			currentSpendCents: 0,
			suspended: false,
		});

		const limit = await spendingLimits.setHardLimit(
			organizationId,
			25_000,
			config,
		);

		expect(limit.hardLimitCents).toBe(25_000);
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe("PUT");
		expect(JSON.parse(init.body as string)).toEqual({ hardLimitCents: 25_000 });
	});

	test("rejects a limit below the $10 minimum without calling Aether", async () => {
		fetchSpy = respond(200, {});

		await expect(
			spendingLimits.setHardLimit(organizationId, 999, config),
		).rejects.toBeInstanceOf(SpendingLimitRejectedError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test("rejects a fractional or absurd limit", async () => {
		await expect(
			spendingLimits.setHardLimit(organizationId, 1000.5, config),
		).rejects.toBeInstanceOf(SpendingLimitRejectedError);
		await expect(
			spendingLimits.setHardLimit(organizationId, 1e12, config),
		).rejects.toBeInstanceOf(SpendingLimitRejectedError);
	});

	test("an Aether rejection is the caller's to fix", async () => {
		fetchSpy = respond(400, { error: "Hard limit must be at least $10" });

		await expect(
			spendingLimits.setHardLimit(organizationId, 5_000, config),
		).rejects.toBeInstanceOf(SpendingLimitRejectedError);
	});

	test("an Aether outage is a retryable failure", async () => {
		fetchSpy = respond(502);

		await expect(
			spendingLimits.setHardLimit(organizationId, 5_000, config),
		).rejects.toBeInstanceOf(SpendingLimitUnavailableError);
	});
});
