import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, eq, isNull } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { apiKeyTable, workspaceTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { validateOrgMembership } from "lib/idp";
import { authz, billing, events } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Assert the observer is a member of the given organization.
 * @param observerIdpId - The observer's identity provider ID
 * @param organizationId - The organization to check membership against
 */
const assertOrgMembership = async (
  observerIdpId: string,
  organizationId: string,
) => {
  const isMember = await validateOrgMembership(observerIdpId, organizationId);

  if (!isMember) {
    throw new GraphQLError("Not a member of this organization", {
      extensions: { code: "FORBIDDEN" },
    });
  }
};

/**
 * Assert the observer has a specific permission on an organization via Warden.
 * @param userId - The observer's database user ID
 * @param organizationId - The organization to check against
 * @param action - The required permission (e.g. "viewer", "member", "admin")
 */
const assertOrgPermission = async (
  userId: string,
  organizationId: string,
  action: string,
) => {
  if (!authz) return;

  const allowed = await authz.checkPermission(
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

// Fallback limits when Aether is unreachable
const DEFAULT_LIMITS = {
  max_workspaces: { free: 1, pro: 10, team: -1 },
};

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

        await assertOrgMembership(
          observer.identityProviderId,
          args.organizationId,
        );
        await assertOrgPermission(observer.id, args.organizationId, "viewer");

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

        // Validate input lengths
        if (name.length > 100) {
          throw new GraphQLError("Name must be 100 characters or fewer", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        if (slug.length > 63) {
          throw new GraphQLError("Slug must be 63 characters or fewer", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
          throw new GraphQLError(
            "Slug must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number",
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }

        if (description && description.length > 500) {
          throw new GraphQLError(
            "Description must be 500 characters or fewer",
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }

        await assertOrgMembership(observer.identityProviderId, organizationId);
        await assertOrgPermission(observer.id, organizationId, "admin");

        // Fetch entitlements before the transaction (external call)
        const entitlements = await billing
          .getEntitlements("organization", organizationId, "synapse")
          .catch(() => null);

        // Wrap count + insert in a transaction to prevent TOCTOU races
        const workspace = await db.transaction(async (tx) => {
          const existingWorkspaces = await tx
            .select({ id: workspaceTable.id })
            .from(workspaceTable)
            .where(eq(workspaceTable.organizationId, organizationId));

          if (
            !isWithinLimit(
              entitlements,
              "max_workspaces",
              existingWorkspaces.length,
              DEFAULT_LIMITS,
            )
          ) {
            throw new GraphQLError(
              "Workspace limit reached. Upgrade your plan for more workspaces",
              { extensions: { code: "QUOTA_EXCEEDED" } },
            );
          }

          const [inserted] = await tx
            .insert(workspaceTable)
            .values({
              organizationId,
              name,
              slug,
              description: description ?? null,
            })
            .returning();

          return inserted;
        });

        void publish({
          type: "synapse.workspace.created",
          source: "omni.synapse",
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

        // Look up workspace to verify it exists and get its organizationId
        const [existing] = await db
          .select({ organizationId: workspaceTable.organizationId })
          .from(workspaceTable)
          .where(eq(workspaceTable.id, args.id));

        if (!existing) {
          throw new GraphQLError("Workspace not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Validate input lengths
        if (args.input.name !== undefined && args.input.name.length > 100) {
          throw new GraphQLError("Name must be 100 characters or fewer", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        if (args.input.slug !== undefined) {
          if (args.input.slug.length > 63) {
            throw new GraphQLError("Slug must be 63 characters or fewer", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }

          if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(args.input.slug)) {
            throw new GraphQLError(
              "Slug must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number",
              { extensions: { code: "BAD_USER_INPUT" } },
            );
          }
        }

        if (
          args.input.description !== undefined &&
          args.input.description.length > 500
        ) {
          throw new GraphQLError(
            "Description must be 500 characters or fewer",
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }

        await assertOrgMembership(
          observer.identityProviderId,
          existing.organizationId,
        );
        await assertOrgPermission(
          observer.id,
          existing.organizationId,
          "admin",
        );

        const set: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
        };
        if (args.input.name !== undefined) set.name = args.input.name;
        if (args.input.slug !== undefined) set.slug = args.input.slug;
        if (args.input.description !== undefined)
          set.description = args.input.description;

        let workspace: typeof workspaceTable.$inferSelect | undefined;
        try {
          [workspace] = await db
            .update(workspaceTable)
            .set(set)
            .where(eq(workspaceTable.id, args.id))
            .returning();
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            err.message.includes("unique") &&
            args.input.slug
          ) {
            throw new GraphQLError(
              `Slug "${args.input.slug}" is already taken in this organization`,
              { extensions: { code: "CONFLICT" } },
            );
          }
          throw err;
        }

        if (!workspace) {
          throw new GraphQLError("Workspace not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        void publish({
          type: "synapse.workspace.updated",
          source: "omni.synapse",
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

        // Look up workspace to verify it exists and get its organizationId
        const [existing] = await db
          .select({ organizationId: workspaceTable.organizationId })
          .from(workspaceTable)
          .where(eq(workspaceTable.id, args.id));

        if (!existing) {
          throw new GraphQLError("Workspace not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await assertOrgMembership(
          observer.identityProviderId,
          existing.organizationId,
        );
        await assertOrgPermission(
          observer.id,
          existing.organizationId,
          "admin",
        );

        // Soft-revoke API keys scoped to this workspace before deleting
        await db
          .update(apiKeyTable)
          .set({ revokedAt: new Date().toISOString() })
          .where(
            and(
              eq(apiKeyTable.workspaceId, args.id),
              isNull(apiKeyTable.revokedAt),
            ),
          );

        const [deleted] = await db
          .delete(workspaceTable)
          .where(eq(workspaceTable.id, args.id))
          .returning();

        if (deleted) {
          void publish({
            type: "synapse.workspace.deleted",
            source: "omni.synapse",
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
