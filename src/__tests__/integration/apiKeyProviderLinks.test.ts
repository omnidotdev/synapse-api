import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import { GraphQLError } from "graphql";

import {
	apiKeyProviderTable,
	apiKeyTable,
	providerKeyTable,
} from "lib/db/schema";
import {
	apiKeyFactory,
	providerKeyFactory,
	userFactory,
} from "test/factories";
import { setupTestContext } from "test/setup/testContext";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

const ctx = setupTestContext();

/**
 * Build a minimal GraphQL context for testing resolver logic
 */
const buildContext = (
	observer: GraphQLContext["observer"] = null,
): GraphQLContext =>
	({
		observer,
		db: ctx.db,
	}) as unknown as GraphQLContext;

// Resolver logic extracted from apiKeys.plugin.ts for direct testing

const linkProviderKeyResolver = async (
	args: { apiKeyId: string; providerKeyId: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const [apiKey] = await db
		.select({ id: apiKeyTable.id })
		.from(apiKeyTable)
		.where(
			and(
				eq(apiKeyTable.id, args.apiKeyId),
				eq(apiKeyTable.userId, observer.id),
				isNull(apiKeyTable.revokedAt),
			),
		);

	if (!apiKey) {
		throw new GraphQLError("API key not found", {
			extensions: { code: "NOT_FOUND" },
		});
	}

	const [providerKey] = await db
		.select({ id: providerKeyTable.id })
		.from(providerKeyTable)
		.where(
			and(
				eq(providerKeyTable.id, args.providerKeyId),
				eq(providerKeyTable.userId, observer.id),
			),
		);

	if (!providerKey) {
		throw new GraphQLError("Provider key not found", {
			extensions: { code: "NOT_FOUND" },
		});
	}

	const [inserted] = await db
		.insert(apiKeyProviderTable)
		.values({
			apiKeyId: args.apiKeyId,
			providerKeyId: args.providerKeyId,
		})
		.onConflictDoNothing()
		.returning();

	return !!inserted;
};

const unlinkProviderKeyResolver = async (
	args: { apiKeyId: string; providerKeyId: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const [apiKey] = await db
		.select({ id: apiKeyTable.id })
		.from(apiKeyTable)
		.where(
			and(
				eq(apiKeyTable.id, args.apiKeyId),
				eq(apiKeyTable.userId, observer.id),
			),
		);

	if (!apiKey) {
		throw new GraphQLError("API key not found", {
			extensions: { code: "NOT_FOUND" },
		});
	}

	const [deleted] = await db
		.delete(apiKeyProviderTable)
		.where(
			and(
				eq(apiKeyProviderTable.apiKeyId, args.apiKeyId),
				eq(apiKeyProviderTable.providerKeyId, args.providerKeyId),
			),
		)
		.returning();

	return !!deleted;
};

const linkedProvidersResolver = async (
	apiKeyId: string,
	context: GraphQLContext,
) => {
	const { db } = context;

	return db
		.select({
			id: providerKeyTable.id,
			provider: providerKeyTable.provider,
			keyHint: providerKeyTable.keyHint,
		})
		.from(apiKeyProviderTable)
		.innerJoin(
			providerKeyTable,
			eq(apiKeyProviderTable.providerKeyId, providerKeyTable.id),
		)
		.where(eq(apiKeyProviderTable.apiKeyId, apiKeyId));
};

describe("linkProviderKey resolver", () => {
	test("links a provider key to an API key", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
		});

		const result = await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		expect(result).toBe(true);

		// Verify the link exists in the database
		const [link] = await ctx.db
			.select()
			.from(apiKeyProviderTable)
			.where(
				and(
					eq(apiKeyProviderTable.apiKeyId, apiKey.id),
					eq(apiKeyProviderTable.providerKeyId, providerKey.id),
				),
			);

		expect(link).toBeDefined();
	});

	test("returns false when linking the same pair twice (idempotent)", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
		});

		await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		const result = await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		expect(result).toBe(false);
	});

	test("throws NOT_FOUND when API key belongs to another user", async () => {
		const user1 = await userFactory.create(ctx.db);
		const user2 = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user1.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user2.id,
		});

		await expect(
			linkProviderKeyResolver(
				{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
				buildContext(user2),
			),
		).rejects.toThrow("API key not found");
	});

	test("throws NOT_FOUND when provider key belongs to another user", async () => {
		const user1 = await userFactory.create(ctx.db);
		const user2 = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user1.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user2.id,
		});

		await expect(
			linkProviderKeyResolver(
				{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
				buildContext(user1),
			),
		).rejects.toThrow("Provider key not found");
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		await expect(
			linkProviderKeyResolver(
				{
					apiKeyId: "00000000-0000-0000-0000-000000000000",
					providerKeyId: "00000000-0000-0000-0000-000000000000",
				},
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});

	test("throws NOT_FOUND for a revoked API key", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			revokedAt: new Date().toISOString(),
		});
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
		});

		await expect(
			linkProviderKeyResolver(
				{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
				buildContext(user),
			),
		).rejects.toThrow("API key not found");
	});
});

describe("unlinkProviderKey resolver", () => {
	test("removes a linked provider key", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
		});

		// Link first
		await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		const result = await unlinkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		expect(result).toBe(true);

		// Verify the link is removed
		const links = await ctx.db
			.select()
			.from(apiKeyProviderTable)
			.where(eq(apiKeyProviderTable.apiKeyId, apiKey.id));

		expect(links).toHaveLength(0);
	});

	test("returns false when no link exists", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
		});

		const result = await unlinkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		expect(result).toBe(false);
	});

	test("throws UNAUTHENTICATED without observer", async () => {
		await expect(
			unlinkProviderKeyResolver(
				{
					apiKeyId: "00000000-0000-0000-0000-000000000000",
					providerKeyId: "00000000-0000-0000-0000-000000000000",
				},
				buildContext(null),
			),
		).rejects.toThrow("Authentication required");
	});
});

describe("linkedProviders resolver", () => {
	test("returns linked providers for an API key", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const providerKey = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
		});

		await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: providerKey.id },
			buildContext(user),
		);

		const providers = await linkedProvidersResolver(
			apiKey.id,
			buildContext(user),
		);

		expect(providers).toHaveLength(1);
		expect(providers[0].id).toBe(providerKey.id);
		expect(providers[0].provider).toBe("anthropic");
		expect(providers[0].keyHint).toBe(providerKey.keyHint);
	});

	test("returns empty array when no providers are linked", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });

		const providers = await linkedProvidersResolver(
			apiKey.id,
			buildContext(user),
		);

		expect(providers).toHaveLength(0);
	});

	test("returns multiple linked providers", async () => {
		const user = await userFactory.create(ctx.db);
		const apiKey = await apiKeyFactory.create(ctx.db, { userId: user.id });
		const pk1 = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "openai",
		});
		const pk2 = await providerKeyFactory.create(ctx.db, {
			userId: user.id,
			provider: "anthropic",
		});

		await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: pk1.id },
			buildContext(user),
		);
		await linkProviderKeyResolver(
			{ apiKeyId: apiKey.id, providerKeyId: pk2.id },
			buildContext(user),
		);

		const providers = await linkedProvidersResolver(
			apiKey.id,
			buildContext(user),
		);

		expect(providers).toHaveLength(2);

		const providerNames = providers.map(
			(p: { provider: string }) => p.provider,
		);
		expect(providerNames).toContain("openai");
		expect(providerNames).toContain("anthropic");
	});
});
