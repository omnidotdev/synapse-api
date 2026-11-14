import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import {
	countWorkspaceKeys,
	countWorkspaceRequests,
	resolveKeyOrganization,
	startOfUtcMonth,
	workspaceBillingEntity,
} from "lib/billing/workspaceBilling";
import { apiKeyTable, usageEventTable } from "lib/db/schema";
import { handleOrganizationDeleted } from "lib/idp/webhooks";
import { apiKeyFactory, userFactory, workspaceFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const ctx = setupTestContext();

describe("workspaceBillingEntity", () => {
	test("a direct key bills the workspace that owns it", () => {
		const organizationId = crypto.randomUUID();

		expect(workspaceBillingEntity({ appId: null, organizationId })).toEqual({
			entityType: "organization",
			entityId: organizationId,
		});
	});

	test("product keys and legacy keys bill something else", () => {
		expect(
			workspaceBillingEntity({ appId: "facet", organizationId: null }),
		).toBeNull();
		expect(
			workspaceBillingEntity({ appId: null, organizationId: null }),
		).toBeNull();
	});
});

describe("resolveKeyOrganization", () => {
	test("an explicit workspace wins", async () => {
		const organizationId = crypto.randomUUID();

		expect(await resolveKeyOrganization(ctx.db, { organizationId })).toBe(
			organizationId,
		);
	});

	test("a workspace resource lends the key its organization", async () => {
		const resource = await workspaceFactory.create(ctx.db);

		expect(
			await resolveKeyOrganization(ctx.db, { workspaceId: resource.id }),
		).toBe(resource.organizationId);
	});

	test("rejects a resource from a different workspace", async () => {
		const resource = await workspaceFactory.create(ctx.db);

		await expect(
			resolveKeyOrganization(ctx.db, {
				organizationId: crypto.randomUUID(),
				workspaceId: resource.id,
			}),
		).rejects.toThrow("different workspace");
	});

	test("a key must belong to a workspace", async () => {
		await expect(resolveKeyOrganization(ctx.db, {})).rejects.toThrow(
			"Choose a workspace",
		);
	});
});

describe("workspace counters", () => {
	test("count every member's active user keys, never managed or revoked ones", async () => {
		const organizationId = crypto.randomUUID();
		const alice = await userFactory.create(ctx.db);
		const bob = await userFactory.create(ctx.db);

		await apiKeyFactory.create(ctx.db, { userId: alice.id, organizationId });
		await apiKeyFactory.create(ctx.db, { userId: bob.id, organizationId });
		await apiKeyFactory.create(ctx.db, {
			userId: bob.id,
			organizationId,
			revokedAt: new Date().toISOString(),
		});
		await apiKeyFactory.create(ctx.db, {
			userId: bob.id,
			organizationId,
			mode: "managed",
		});
		// Another workspace's key
		await apiKeyFactory.create(ctx.db, {
			userId: alice.id,
			organizationId: crypto.randomUUID(),
		});

		expect(await countWorkspaceKeys(ctx.db, organizationId)).toBe(2);
	});

	test("count requests from every key in the workspace this month", async () => {
		const organizationId = crypto.randomUUID();
		const user = await userFactory.create(ctx.db);
		const inWorkspace = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			organizationId,
		});
		const legacy = await apiKeyFactory.create(ctx.db, { userId: user.id });

		const event = (apiKeyId: string, createdAt?: string) => ({
			userId: user.id,
			apiKeyId,
			provider: "anthropic",
			model: "claude-3-5-sonnet",
			mode: "byok",
			...(createdAt ? { createdAt } : {}),
		});

		await ctx.db
			.insert(usageEventTable)
			.values([
				event(inWorkspace.id),
				event(inWorkspace.id),
				event(legacy.id),
				event(inWorkspace.id, "2020-01-15T00:00:00.000Z"),
			]);

		expect(
			await countWorkspaceRequests(ctx.db, organizationId, startOfUtcMonth()),
		).toBe(2);
	});
});

describe("organization deletion", () => {
	test("revokes the deleted workspace's keys and leaves others alone", async () => {
		const organizationId = crypto.randomUUID();
		const user = await userFactory.create(ctx.db);
		const doomed = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			organizationId,
		});
		const survivor = await apiKeyFactory.create(ctx.db, {
			userId: user.id,
			organizationId: crypto.randomUUID(),
		});

		await handleOrganizationDeleted({
			eventType: "organization.deleted",
			organizationId,
			deletedAt: new Date().toISOString(),
		});

		const revokedAtOf = async (id: string) =>
			(
				await ctx.db
					.select({ revokedAt: apiKeyTable.revokedAt })
					.from(apiKeyTable)
					.where(eq(apiKeyTable.id, id))
			)[0]?.revokedAt;

		expect(await revokedAtOf(doomed.id)).not.toBeNull();
		expect(await revokedAtOf(survivor.id)).toBeNull();
	});
});
