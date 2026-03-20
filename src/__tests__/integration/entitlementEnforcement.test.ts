import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { and, eq, isNull, ne } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { isWithinLimit } from "@omnidotdev/providers/billing";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable, workspaceTable } from "lib/db/schema";
import { billing } from "lib/providers";
import { userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

const ctx = setupTestContext();

/**
 * Build a minimal GraphQL context for testing resolver logic.
 */
const buildContext = (
	observer: GraphQLContext["observer"] = null,
): GraphQLContext =>
	({
		observer,
		db: ctx.db,
	}) as unknown as GraphQLContext;

// ── Fallback limits (mirrors production defaults) ──────────────────────

const API_KEY_LIMITS = {
	max_api_keys: { free: 1, pro: 25, team: -1 },
};

const WORKSPACE_LIMITS = {
	max_workspaces: { free: 1, pro: 10, team: -1 },
};

// ── Resolver logic extracted from apiKeys.plugin.ts ────────────────────

const createApiKeyResolver = async (
	args: { input: { name: string; mode: string; workspaceId?: string } },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const { name, mode, workspaceId } = args.input;

	// Enforce max_api_keys entitlement (managed keys excluded from quota)
	const activeKeys = await db
		.select({ id: apiKeyTable.id })
		.from(apiKeyTable)
		.where(
			and(
				eq(apiKeyTable.userId, observer.id),
				isNull(apiKeyTable.revokedAt),
				ne(apiKeyTable.mode, "managed"),
			),
		);

	const entitlements = await billing
		.getEntitlements(
			"user",
			observer.identityProviderId ?? observer.id,
			"synapse",
		)
		.catch(() => null);

	if (
		!isWithinLimit(
			entitlements,
			"max_api_keys",
			activeKeys.length,
			API_KEY_LIMITS,
		)
	) {
		throw new GraphQLError(
			"API key limit reached. Upgrade your plan for more keys",
			{ extensions: { code: "QUOTA_EXCEEDED" } },
		);
	}

	const { raw, hash, hint } = generateApiKey();

	const [apiKey] = await db
		.insert(apiKeyTable)
		.values({
			userId: observer.id,
			name,
			mode,
			workspaceId: workspaceId ?? null,
			keyHash: hash,
			keyHint: hint,
		})
		.returning();

	return { rawKey: raw, apiKeyId: apiKey.id, keyHint: hint };
};

// ── Resolver logic extracted from workspaces.plugin.ts ─────────────────

const addWorkspaceResolver = async (
	args: {
		input: {
			organizationId: string;
			name: string;
			slug: string;
			description?: string;
		};
	},
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const { organizationId, name, slug, description } = args.input;

	// Enforce max_workspaces entitlement
	const existingWorkspaces = await db
		.select({ id: workspaceTable.id })
		.from(workspaceTable)
		.where(eq(workspaceTable.organizationId, organizationId));

	const entitlements = await billing
		.getEntitlements("organization", organizationId, "synapse")
		.catch(() => null);

	if (
		!isWithinLimit(
			entitlements,
			"max_workspaces",
			existingWorkspaces.length,
			WORKSPACE_LIMITS,
		)
	) {
		throw new GraphQLError(
			"Workspace limit reached. Upgrade your plan for more workspaces",
			{ extensions: { code: "QUOTA_EXCEEDED" } },
		);
	}

	const [workspace] = await db
		.insert(workspaceTable)
		.values({
			organizationId,
			name,
			slug,
			description: description ?? null,
		})
		.returning();

	return workspace;
};

// ── Tests ──────────────────────────────────────────────────────────────

describe("entitlement enforcement: API keys", () => {
	test("allows creation when under free-tier limit", async () => {
		const user = await userFactory.create(ctx.db);

		const result = await createApiKeyResolver(
			{ input: { name: "first key", mode: "byok" } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^synapse_/);
		expect(result.apiKeyId).toBeDefined();
	});

	test("blocks creation when free-tier limit is reached", async () => {
		const user = await userFactory.create(ctx.db);

		// Create first key (uses free-tier limit of 1)
		await createApiKeyResolver(
			{ input: { name: "first key", mode: "byok" } },
			buildContext(user),
		);

		// Second key should exceed the free-tier limit
		await expect(
			createApiKeyResolver(
				{ input: { name: "second key", mode: "byok" } },
				buildContext(user),
			),
		).rejects.toThrow("API key limit reached");
	});

	test("does not count managed keys toward quota", async () => {
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();

		// Insert a managed key (auto-provisioned by another Omni app)
		await ctx.db.insert(apiKeyTable).values({
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
			name: "Beacon",
			mode: "managed",
		});

		// User should still be able to create their own key
		const result = await createApiKeyResolver(
			{ input: { name: "my key", mode: "byok" } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^synapse_/);
	});

	test("does not count revoked keys toward quota", async () => {
		const user = await userFactory.create(ctx.db);

		// Create and revoke a key
		const first = await createApiKeyResolver(
			{ input: { name: "first key", mode: "byok" } },
			buildContext(user),
		);

		await ctx.db
			.update(apiKeyTable)
			.set({
				revokedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(apiKeyTable.id, first.apiKeyId));

		// Should succeed since the revoked key doesn't count
		const second = await createApiKeyResolver(
			{ input: { name: "second key", mode: "byok" } },
			buildContext(user),
		);

		expect(second.rawKey).toMatch(/^synapse_/);
	});
});

describe("entitlement enforcement: workspaces", () => {
	test("allows creation when under free-tier limit", async () => {
		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000100";

		const result = await addWorkspaceResolver(
			{
				input: {
					organizationId: orgId,
					name: "First Workspace",
					slug: "first-workspace",
				},
			},
			buildContext(user),
		);

		expect(result.id).toBeDefined();
		expect(result.name).toBe("First Workspace");
	});

	test("blocks creation when free-tier limit is reached", async () => {
		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000101";

		// Create first workspace (uses free-tier limit of 1)
		await addWorkspaceResolver(
			{
				input: {
					organizationId: orgId,
					name: "First Workspace",
					slug: "first-ws",
				},
			},
			buildContext(user),
		);

		// Second workspace should exceed the free-tier limit
		await expect(
			addWorkspaceResolver(
				{
					input: {
						organizationId: orgId,
						name: "Second Workspace",
						slug: "second-ws",
					},
				},
				buildContext(user),
			),
		).rejects.toThrow("Workspace limit reached");
	});

	test("allows multiple workspaces across different organizations", async () => {
		const user = await userFactory.create(ctx.db);
		const orgId1 = "00000000-0000-0000-0000-000000000102";
		const orgId2 = "00000000-0000-0000-0000-000000000103";

		const ws1 = await addWorkspaceResolver(
			{
				input: {
					organizationId: orgId1,
					name: "Org1 Workspace",
					slug: "org1-ws",
				},
			},
			buildContext(user),
		);

		const ws2 = await addWorkspaceResolver(
			{
				input: {
					organizationId: orgId2,
					name: "Org2 Workspace",
					slug: "org2-ws",
				},
			},
			buildContext(user),
		);

		// Each org has its own quota, so both should succeed
		expect(ws1.id).toBeDefined();
		expect(ws2.id).toBeDefined();
	});
});

describe("isWithinLimit utility", () => {
	test("returns true when current count is below limit", () => {
		const result = isWithinLimit(null, "max_api_keys", 0, API_KEY_LIMITS);
		expect(result).toBe(true);
	});

	test("returns false when current count equals limit", () => {
		const result = isWithinLimit(null, "max_api_keys", 1, API_KEY_LIMITS);
		expect(result).toBe(false);
	});

	test("returns true when limit is -1 (unlimited)", () => {
		// Simulate a team-tier entitlement with unlimited keys
		const entitlements = {
			entitlements: [{ featureKey: "max_api_keys", value: -1 }],
		} as unknown as EntitlementsResponse;

		const result = isWithinLimit(
			entitlements,
			"max_api_keys",
			100,
			API_KEY_LIMITS,
		);
		expect(result).toBe(true);
	});

	test("uses entitlement value when available", () => {
		// Simulate a pro-tier entitlement
		const entitlements = {
			entitlements: [{ featureKey: "max_api_keys", value: 25 }],
		} as unknown as EntitlementsResponse;

		const result = isWithinLimit(
			entitlements,
			"max_api_keys",
			24,
			API_KEY_LIMITS,
		);
		expect(result).toBe(true);
	});

	test("blocks when entitlement value is reached", () => {
		const entitlements = {
			entitlements: [{ featureKey: "max_api_keys", value: 25 }],
		} as unknown as EntitlementsResponse;

		const result = isWithinLimit(
			entitlements,
			"max_api_keys",
			25,
			API_KEY_LIMITS,
		);
		expect(result).toBe(false);
	});
});
