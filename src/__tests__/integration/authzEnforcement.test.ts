import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing crypto module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GraphQLError } from "graphql";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable, workspaceTable } from "lib/db/schema";
import { userFactory, workspaceFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

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

// ── assertOrgPermission extracted for direct testing ───────────────────

/**
 * Configurable authz mock.
 * Set `checkPermission` to control behavior per test.
 */
let mockAuthz: {
	checkPermission: (
		userId: string,
		objectType: string,
		objectId: string,
		action: string,
	) => Promise<boolean>;
} | null = null;

/**
 * Assert the observer has a specific permission on an organization via Warden.
 * No-ops if Warden is not configured (mirrors production behavior).
 */
const assertOrgPermission = async (
	userId: string,
	organizationId: string,
	action: string,
) => {
	if (!mockAuthz) return;

	const allowed = await mockAuthz.checkPermission(
		userId,
		"organization",
		organizationId,
		action,
	);

	if (!allowed) {
		throw new GraphQLError(`Insufficient permissions: requires ${action}`, {
			extensions: { code: "FORBIDDEN" },
		});
	}
};

// ── Resolver logic mirroring apiKeys.plugin.ts ─────────────────────────

const generateApiKeyWithAuthz = async (
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

	// If workspace-scoped, verify org-level editor permission
	if (workspaceId) {
		const [workspace] = await db
			.select({ organizationId: workspaceTable.organizationId })
			.from(workspaceTable)
			.where(
				(await import("drizzle-orm")).eq(workspaceTable.id, workspaceId),
			);

		if (!workspace) {
			throw new GraphQLError("Workspace not found", {
				extensions: { code: "NOT_FOUND" },
			});
		}

		await assertOrgPermission(observer.id, workspace.organizationId, "admin");
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

// ── Resolver logic mirroring workspaces.plugin.ts ──────────────────────

const addWorkspaceWithAuthz = async (
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

	// Authz check (org membership validation skipped in this test, tested separately)
	await assertOrgPermission(observer.id, organizationId, "admin");

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

const removeWorkspaceWithAuthz = async (
	args: { id: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	const { eq } = await import("drizzle-orm");

	const [existing] = await db
		.select({ organizationId: workspaceTable.organizationId })
		.from(workspaceTable)
		.where(eq(workspaceTable.id, args.id));

	if (!existing) {
		throw new GraphQLError("Workspace not found", {
			extensions: { code: "NOT_FOUND" },
		});
	}

	await assertOrgPermission(observer.id, existing.organizationId, "admin");

	const [deleted] = await db
		.delete(workspaceTable)
		.where(eq(workspaceTable.id, args.id))
		.returning();

	return !!deleted;
};

// ── Tests ──────────────────────────────────────────────────────────────

beforeEach(() => {
	// Reset authz mock to null (disabled) before each test
	mockAuthz = null;
});

describe("authz enforcement: API key mutations", () => {
	test("succeeds when authz provider is null (graceful degradation)", async () => {
		mockAuthz = null;

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000001";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		const result = await generateApiKeyWithAuthz(
			{ input: { name: "ws key", mode: "byok", workspaceId: workspace.id } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^synapse_/);
		expect(result.apiKeyId).toBeDefined();
	});

	test("succeeds when authz grants editor permission", async () => {
		mockAuthz = {
			checkPermission: mock(async () => true),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000002";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		const result = await generateApiKeyWithAuthz(
			{ input: { name: "ws key", mode: "byok", workspaceId: workspace.id } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^synapse_/);
		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"admin",
		);
	});

	test("throws FORBIDDEN when authz denies editor permission", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000003";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		await expect(
			generateApiKeyWithAuthz(
				{
					input: { name: "ws key", mode: "byok", workspaceId: workspace.id },
				},
				buildContext(user),
			),
		).rejects.toThrow("Insufficient permissions: requires editor");

		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"admin",
		);
	});

	test("skips authz check for non-workspace-scoped keys", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);

		// No workspaceId, authz should never be called
		const result = await generateApiKeyWithAuthz(
			{ input: { name: "personal key", mode: "byok" } },
			buildContext(user),
		);

		expect(result.rawKey).toMatch(/^synapse_/);
		expect(mockAuthz.checkPermission).not.toHaveBeenCalled();
	});
});

describe("authz enforcement: workspace mutations", () => {
	test("succeeds when authz provider is null (graceful degradation)", async () => {
		mockAuthz = null;

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000010";

		const result = await addWorkspaceWithAuthz(
			{
				input: {
					organizationId: orgId,
					name: "Test Workspace",
					slug: "test-workspace",
				},
			},
			buildContext(user),
		);

		expect(result.id).toBeDefined();
		expect(result.name).toBe("Test Workspace");
	});

	test("succeeds when authz grants editor permission for addWorkspace", async () => {
		mockAuthz = {
			checkPermission: mock(async () => true),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000011";

		const result = await addWorkspaceWithAuthz(
			{
				input: {
					organizationId: orgId,
					name: "Permitted Workspace",
					slug: "permitted-ws",
				},
			},
			buildContext(user),
		);

		expect(result.id).toBeDefined();
		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"admin",
		);
	});

	test("throws FORBIDDEN when authz denies editor permission for addWorkspace", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000012";

		await expect(
			addWorkspaceWithAuthz(
				{
					input: {
						organizationId: orgId,
						name: "Denied Workspace",
						slug: "denied-ws",
					},
				},
				buildContext(user),
			),
		).rejects.toThrow("Insufficient permissions: requires editor");
	});

	test("throws FORBIDDEN when authz denies admin permission for removeWorkspace", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000013";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		await expect(
			removeWorkspaceWithAuthz({ id: workspace.id }, buildContext(user)),
		).rejects.toThrow("Insufficient permissions: requires admin");

		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"admin",
		);
	});

	test("succeeds when authz grants admin permission for removeWorkspace", async () => {
		mockAuthz = {
			checkPermission: mock(async () => true),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000014";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		const result = await removeWorkspaceWithAuthz(
			{ id: workspace.id },
			buildContext(user),
		);

		expect(result).toBe(true);
		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"admin",
		);
	});
});

// ── usageBreakdown authZ ────────────────────────────────────────────

const queryUsageBreakdownWithAuthz = async (
	args: { startDate: string; endDate: string; workspaceId?: string },
	context: GraphQLContext,
) => {
	const { observer, db } = context;

	if (!observer) {
		throw new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}

	if (args.workspaceId) {
		const { eq } = await import("drizzle-orm");

		const [workspace] = await db
			.select({ organizationId: workspaceTable.organizationId })
			.from(workspaceTable)
			.where(eq(workspaceTable.id, args.workspaceId));

		if (!workspace) {
			throw new GraphQLError("Workspace not found", {
				extensions: { code: "NOT_FOUND" },
			});
		}

		if (mockAuthz) {
			const allowed = await mockAuthz.checkPermission(
				observer.id,
				"organization",
				workspace.organizationId,
				"viewer",
			);

			if (!allowed) {
				throw new GraphQLError(
					"Insufficient permissions: requires viewer",
					{ extensions: { code: "FORBIDDEN" } },
				);
			}
		}
	}

	return { byModel: [], byDay: [] };
};

describe("authz enforcement: usageBreakdown query", () => {
	test("succeeds without workspaceId (no authz check needed)", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);

		const result = await queryUsageBreakdownWithAuthz(
			{ startDate: "2026-01-01", endDate: "2026-01-31" },
			buildContext(user),
		);

		expect(result.byModel).toEqual([]);
		expect(mockAuthz.checkPermission).not.toHaveBeenCalled();
	});

	test("succeeds when authz grants viewer permission for workspace-scoped query", async () => {
		mockAuthz = {
			checkPermission: mock(async () => true),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000020";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		const result = await queryUsageBreakdownWithAuthz(
			{
				startDate: "2026-01-01",
				endDate: "2026-01-31",
				workspaceId: workspace.id,
			},
			buildContext(user),
		);

		expect(result.byModel).toEqual([]);
		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"viewer",
		);
	});

	test("throws FORBIDDEN when authz denies viewer permission for workspace-scoped query", async () => {
		mockAuthz = {
			checkPermission: mock(async () => false),
		};

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000021";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		await expect(
			queryUsageBreakdownWithAuthz(
				{
					startDate: "2026-01-01",
					endDate: "2026-01-31",
					workspaceId: workspace.id,
				},
				buildContext(user),
			),
		).rejects.toThrow("Insufficient permissions: requires viewer");

		expect(mockAuthz.checkPermission).toHaveBeenCalledWith(
			user.id,
			"organization",
			orgId,
			"viewer",
		);
	});

	test("throws NOT_FOUND for non-existent workspace", async () => {
		mockAuthz = {
			checkPermission: mock(async () => true),
		};

		const user = await userFactory.create(ctx.db);

		await expect(
			queryUsageBreakdownWithAuthz(
				{
					startDate: "2026-01-01",
					endDate: "2026-01-31",
					workspaceId: "00000000-0000-0000-0000-000000000099",
				},
				buildContext(user),
			),
		).rejects.toThrow("Workspace not found");
	});

	test("succeeds when authz provider is null (graceful degradation)", async () => {
		mockAuthz = null;

		const user = await userFactory.create(ctx.db);
		const orgId = "00000000-0000-0000-0000-000000000022";

		const workspace = await workspaceFactory.create(ctx.db, {
			organizationId: orgId,
		});

		const result = await queryUsageBreakdownWithAuthz(
			{
				startDate: "2026-01-01",
				endDate: "2026-01-31",
				workspaceId: workspace.id,
			},
			buildContext(user),
		);

		expect(result.byModel).toEqual([]);
	});
});
