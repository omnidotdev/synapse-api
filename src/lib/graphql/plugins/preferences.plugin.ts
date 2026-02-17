import { eq } from "drizzle-orm";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { userPreferenceTable } from "lib/db/schema";

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

    extend type Query {
      """
      Fetch current user's preferences.
      """
      userPreferences: UserPreferences
    }
  `,
	resolvers: {
		Query: {
			async userPreferences(
				_source: unknown,
				_args: Record<string, never>,
				ctx: GraphQLContext,
			) {
				const { observer, db } = ctx;

				if (!observer) {
					throw new GraphQLError("Authentication required", {
						extensions: { code: "UNAUTHENTICATED" },
					});
				}

				const [prefs] = await db
					.select()
					.from(userPreferenceTable)
					.where(eq(userPreferenceTable.userId, observer.id))
					.limit(1);

				return prefs ?? {
					defaultProvider: null,
					notifyUsageThreshold: true,
					notifyKeyExpiry: true,
				};
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

				const values: Record<string, unknown> = {
					userId: observer.id,
					updatedAt: new Date().toISOString(),
				};

				if (defaultProvider !== undefined)
					values.defaultProvider = defaultProvider;
				if (notifyUsageThreshold !== undefined)
					values.notifyUsageThreshold = notifyUsageThreshold;
				if (notifyKeyExpiry !== undefined)
					values.notifyKeyExpiry = notifyKeyExpiry;

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

				return prefs;
			},
		},
	},
});

export default preferencesPlugin;
