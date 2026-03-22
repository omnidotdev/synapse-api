import { faker } from "@faker-js/faker";

import { workspaceTable } from "lib/db/schema";
import { createFactory } from "./base";

import type { InsertWorkspace, SelectWorkspace } from "lib/db/schema";

export const workspaceFactory = createFactory<InsertWorkspace, SelectWorkspace>(
	() => ({
		organizationId: faker.string.uuid(),
		name: faker.company.name(),
		slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
	}),
	async (db, data) => {
		const [workspace] = await db
			.insert(workspaceTable)
			.values(data)
			.returning();
		return workspace;
	},
);
