import { and, eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { workspaceTable } from "lib/db/schema";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Workspace CRUD mutations
 */
const workspacesPlugin = makeExtendSchemaPlugin({
	typeDefs: gql`
    input CreateWorkspaceInput {
      organizationId: UUID!
      name: String!
      slug: String!
      description: String
    }

    input UpdateWorkspaceInput {
      name: String
      slug: String
      description: String
    }

    type WorkspaceResult {
      id: UUID!
      organizationId: UUID!
      name: String!
      slug: String!
      description: String
      createdAt: Datetime!
    }

    extend type Mutation {
      """
      Create a new workspace within an organization
      """
      createWorkspace(input: CreateWorkspaceInput!): WorkspaceResult

      """
      Update a workspace's details
      """
      updateWorkspace(id: UUID!, input: UpdateWorkspaceInput!): WorkspaceResult

      """
      Delete a workspace
      """
      deleteWorkspace(id: UUID!): Boolean
    }

    extend type Query {
      """
      List workspaces for an organization
      """
      workspaces(organizationId: UUID!): [WorkspaceResult!]!
    }
  `,
	resolvers: {
		Query: {
			async workspaces(
				_source: unknown,
				args: { organizationId: string },
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				return db
					.select()
					.from(workspaceTable)
					.where(eq(workspaceTable.organizationId, args.organizationId));
			},
		},
		Mutation: {
			async createWorkspace(
				_source: unknown,
				args: {
					input: {
						organizationId: string;
						name: string;
						slug: string;
						description?: string;
					};
				},
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				const { organizationId, name, slug, description } = args.input;

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
			},

			async updateWorkspace(
				_source: unknown,
				args: {
					id: string;
					input: { name?: string; slug?: string; description?: string };
				},
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				const set: Record<string, unknown> = {
					updatedAt: new Date().toISOString(),
				};
				if (args.input.name !== undefined) set.name = args.input.name;
				if (args.input.slug !== undefined) set.slug = args.input.slug;
				if (args.input.description !== undefined)
					set.description = args.input.description;

				const [workspace] = await db
					.update(workspaceTable)
					.set(set)
					.where(eq(workspaceTable.id, args.id))
					.returning();

				return workspace;
			},

			async deleteWorkspace(
				_source: unknown,
				args: { id: string },
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				const [deleted] = await db
					.delete(workspaceTable)
					.where(eq(workspaceTable.id, args.id))
					.returning();

				return !!deleted;
			},
		},
	},
});

export default workspacesPlugin;
