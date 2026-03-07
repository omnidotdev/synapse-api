import { eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { userPreferenceTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { events } from "lib/providers";

import type { InsertUserPreference } from "lib/db/schema/userPreference.table";
import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * User preferences mutations
 */
const preferencesPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    input UpdateUserPreferencesInput {
      defaultProvider: String
      notifyUsageThreshold: Boolean
      notifyKeyExpiry: Boolean
    }

    type UserPreferences {
      defaultProvider: String
      notifyUsageThreshold: Boolean!
      notifyKeyExpiry: Boolean!
    }

    extend type Mutation {
      """
      Update user preferences. Creates preferences row if it doesn't exist.
      """
      updateUserPreferences(input: UpdateUserPreferencesInput!): UserPreferences
    }

    extend type Observer {
      """
      Fetch current user's preferences.
      """
      preferences: UserPreferences
    }
  `,
  resolvers: {
    Observer: {
      async preferences(
        observer: { id: string },
        _args: Record<string, never>,
        ctx: GraphQLContext,
      ) {
        const { db } = ctx;

        const [prefs] = await db
          .select()
          .from(userPreferenceTable)
          .where(eq(userPreferenceTable.userId, observer.id))
          .limit(1);

        return (
          prefs ?? {
            defaultProvider: null,
            notifyUsageThreshold: true,
            notifyKeyExpiry: true,
          }
        );
      },
    },
    Mutation: {
      async updateUserPreferences(
        _source: unknown,
        args: {
          input: {
            defaultProvider?: string;
            notifyUsageThreshold?: boolean;
            notifyKeyExpiry?: boolean;
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

        const { defaultProvider, notifyUsageThreshold, notifyKeyExpiry } =
          args.input;

        const values: InsertUserPreference = {
          userId: observer.id,
          updatedAt: new Date().toISOString(),
          ...(defaultProvider !== undefined && { defaultProvider }),
          ...(notifyUsageThreshold !== undefined && { notifyUsageThreshold }),
          ...(notifyKeyExpiry !== undefined && { notifyKeyExpiry }),
        };

        const [prefs] = await db
          .insert(userPreferenceTable)
          .values(values)
          .onConflictDoUpdate({
            target: userPreferenceTable.userId,
            set: {
              ...(defaultProvider !== undefined && { defaultProvider }),
              ...(notifyUsageThreshold !== undefined && {
                notifyUsageThreshold,
              }),
              ...(notifyKeyExpiry !== undefined && { notifyKeyExpiry }),
              updatedAt: new Date().toISOString(),
            },
          })
          .returning();

        void publish({
          type: "synapse.preferences.updated",
          source: "synapse-api",
          organizationId: observer.id,
          subject: observer.id,
          data: { userId: observer.id, ...args.input },
        });
        void events.emit({
          type: "synapse.preferences.updated",
          data: { userId: observer.id, ...args.input },
          organizationId: observer.id,
          subject: observer.id,
        });

        return prefs;
      },
    },
  },
});

export default preferencesPlugin;
