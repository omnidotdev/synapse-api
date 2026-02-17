import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { generateDefaultDate, generateDefaultId } from "lib/db/util";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Workspace table.
 * Workspaces are scoped to an organization (managed by Gatekeeper).
 */
export const workspaceTable = pgTable(
	"workspace",
	{
		id: generateDefaultId(),
		organizationId: uuid().notNull(),
		slug: text().notNull(),
		name: text().notNull(),
		description: text(),
		createdAt: generateDefaultDate(),
		updatedAt: generateDefaultDate(),
	},
	(table) => [
		uniqueIndex().on(table.id),
		uniqueIndex("workspace_org_slug_unique").on(table.organizationId, table.slug),
		index().on(table.organizationId),
	],
);

export type InsertWorkspace = InferInsertModel<typeof workspaceTable>;
export type SelectWorkspace = InferSelectModel<typeof workspaceTable>;
