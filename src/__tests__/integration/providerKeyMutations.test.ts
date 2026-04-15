import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { encrypt } from "lib/crypto";
import { providerKeyTable } from "lib/db/schema";
import { providerKeyFactory, userFactory } from "test/factories";
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

// Resolver logic extracted from providerKeys.plugin.ts for direct testing
const setProviderKeyResolver = async (
	args: { input: { provider: string; key: string } },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const { provider, key } = args.input;
	const encryptedKey = encrypt(key);
	const keyHint = key.slice(-4);

	const [providerKey] = await db
		.insert(providerKeyTable)
		.values({
			userId: observer.id,
			provider,
			encryptedKey,
			keyHint,
		})
		.onConflictDoUpdate({
			target: [providerKeyTable.userId, providerKeyTable.provider],
			set: {
				encryptedKey,
				keyHint,
				updatedAt: new Date().toISOString(),
			},
		})
		.returning();

	return providerKey;
};

const deleteProviderKeyResolver = async (
	args: { id: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const [deleted] = await db
		.delete(providerKeyTable)
		.where(
			and(
				eq(providerKeyTable.id, args.id),
				eq(providerKeyTable.userId, observer.id),
			),
		)
		.returning();

	return !!deleted;
};

describe("setProviderKey resolver", () => {
	test("encrypts and stores key", async () => {
		const user = await userFactory.create(ctx.db);

		const result = await setProviderKeyResolver(
			{ input: { provider: "anthropic", key: "sk-ant-test-key-abcd1234" } },
			buildContext(user),
		);

		expect(result.id).toBeDefined();
		expect(result.provider).toBe("anthropic");
		expect(result.keyHint).toBe("1234");
		expect(result.encryptedKey).not.toBe("sk-ant-test-key-abcd1234");
	});

	test("upserts on same user and provider", async () => {
		const user = await userFactory.create(ctx.db);

		await setProviderKeyResolver(
			{ input: { provider: "openai", key: "sk-first-key-aaaa" } },
			buildContext(user),
		);

		await setProviderKeyResolver(
			{ input: { provider: "openai", key: "sk-second-key-bbbb" } },
			buildContext(user),
		);

		// Verify only one row exists for this user+provider
		const rows = await ctx.db
			.select()
			.from(providerKeyTable)
			.where(
				and(
					eq(providerKeyTable.userId, user.id),
					eq(providerKeyTable.provider, "openai"),
				),
			);

		expect(rows).toHaveLength(1);
		expect(rows[0].keyHint).toBe("bbbb");
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		expect(
			setProviderKeyResolver(
				{ input: { provider: "anthropic", key: "sk-test" } },
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});
});

describe("deleteProviderKey resolver", () => {
	test("deletes owned key", async () => {
		const user = await userFactory.create(ctx.db);

		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
		});

		const result = await deleteProviderKeyResolver(
			{ id: providerKey.id },
			buildContext(user),
		);

		expect(result).toBe(true);

		// Verify key is deleted from the database
		const rows = await ctx.db
			.select()
			.from(providerKeyTable)
			.where(eq(providerKeyTable.id, providerKey.id));

		expect(rows).toHaveLength(0);
	});

	test("returns false for another user's key", async () => {
		const user1 = await userFactory.create(ctx.db);
		const user2 = await userFactory.create(ctx.db);

		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user1.id,
			provider: "anthropic",
		});

		const result = await deleteProviderKeyResolver(
			{ id: providerKey.id },
			buildContext(user2),
		);

		expect(result).toBe(false);

		// Verify key still exists
		const rows = await ctx.db
			.select()
			.from(providerKeyTable)
			.where(eq(providerKeyTable.id, providerKey.id));

		expect(rows).toHaveLength(1);
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		expect(
			deleteProviderKeyResolver(
				{ id: "00000000-0000-0000-0000-000000000000" },
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});
});
