import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";
import { apiKeyFactory, userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

const ctx = setupTestContext();

/**
 * Build a minimal GraphQL context for testing resolver logic.
 * Mirrors the context the plugin resolvers receive at runtime.
 */
const buildContext = (
	observer: GraphQLContext["observer"] = null,
): GraphQLContext =>
	({
		observer,
		db: ctx.db,
	}) as unknown as GraphQLContext;

// Resolver logic extracted from apiKeys.plugin.ts for direct testing
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

const revokeApiKeyResolver = async (
	args: { id: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const [updated] = await db
		.update(apiKeyTable)
		.set({
			revokedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
		.where(
			and(
				eq(apiKeyTable.id, args.id),
				eq(apiKeyTable.userId, observer.id),
				isNull(apiKeyTable.revokedAt),
			),
		)
		.returning();

	return !!updated;
};

describe("createApiKey resolver", () => {
	test("returns rawKey starting with sk-syn-, apiKeyId, and keyHint", async () => {
		const user = await userFactory.create(ctx.db);

		const result = await createApiKeyResolver(
			{ input: { name: "test key", mode: "byok" } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^sk-syn-/);
		expect(result.apiKeyId).toBeDefined();
		expect(result.keyHint).toHaveLength(4);
		expect(result.rawKey.endsWith(result.keyHint)).toBe(true);
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		expect(
			createApiKeyResolver(
				{ input: { name: "test key", mode: "byok" } },
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});
});

describe("revokeApiKey resolver", () => {
	test("sets revokedAt on owned key", async () => {
		const user = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			keyHash: hash,
			keyHint: hint,
		});

		const result = await revokeApiKeyResolver(
			{ id: apiKey.id },
			buildContext(user),
		);

		expect(result).toBe(true);

		// Verify revokedAt is set in the database
		const [updated] = await ctx.db
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.id, apiKey.id));

		expect(updated.revokedAt).not.toBeNull();
	});

	test("returns false for another user's key", async () => {
		const user1 = await userFactory.create(ctx.db);
		const user2 = await userFactory.create(ctx.db);
		const { hash, hint } = generateApiKey();

		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user1.id,
			keyHash: hash,
			keyHint: hint,
		});

		const result = await revokeApiKeyResolver(
			{ id: apiKey.id },
			buildContext(user2),
		);

		expect(result).toBe(false);

		// Verify key is NOT revoked
		const [unchanged] = await ctx.db
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.id, apiKey.id));

		expect(unchanged.revokedAt).toBeNull();
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		expect(
			revokeApiKeyResolver(
				{ id: "00000000-0000-0000-0000-000000000000" },
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});
});
