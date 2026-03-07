import { eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { workspaceTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { events } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Workspace CRUD mutations
 */
const workspacesPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input NewWorkspaceInput {
      organizationId: UUID!
      name: String!
      slug: String!
      description: String
    }

    input PatchWorkspaceInput {
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
      addWorkspace(input: NewWorkspaceInput!): WorkspaceResult

      """
      Update a workspace's details
      """
      patchWorkspace(id: UUID!, input: PatchWorkspaceInput!): WorkspaceResult

      """
      Delete a workspace
      """
      removeWorkspace(id: UUID!): Boolean
    }

    extend type Query {
      """
      List workspaces for an organization
      """
      orgWorkspaces(organizationId: UUID!): [WorkspaceResult!]!
    }
  `,
  resolvers: {
    Query: {
      async orgWorkspaces(
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
      async addWorkspace(
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

        void publish({
          type: "synapse.workspace.created",
          source: "synapse-api",
          organizationId,
          subject: workspace.id,
          data: { workspaceId: workspace.id, name, slug, organizationId },
        });
        void events.emit({
          type: "synapse.workspace.created",
          data: { workspaceId: workspace.id, name, slug, organizationId },
          organizationId,
          subject: workspace.id,
        });

        return workspace;
      },

      async patchWorkspace(
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

        void publish({
          type: "synapse.workspace.updated",
          source: "synapse-api",
          organizationId: workspace.organizationId,
          subject: workspace.id,
          data: { workspaceId: workspace.id, ...args.input },
        });
        void events.emit({
          type: "synapse.workspace.updated",
          data: { workspaceId: workspace.id, ...args.input },
          organizationId: workspace.organizationId,
          subject: workspace.id,
        });

        return workspace;
      },

      async removeWorkspace(
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

        if (deleted) {
          void publish({
            type: "synapse.workspace.deleted",
            source: "synapse-api",
            organizationId: deleted.organizationId,
            subject: args.id,
            data: { workspaceId: args.id },
          });
          void events.emit({
            type: "synapse.workspace.deleted",
            data: { workspaceId: args.id },
            organizationId: deleted.organizationId,
            subject: args.id,
          });
        }

        return !!deleted;
      },
    },
  },
});

export default workspacesPlugin;
