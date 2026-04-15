import { gql, makeExtendSchemaPlugin } from "graphile-utils";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Observer root query: exposes the authenticated user as a parent
 * object for all user-scoped domain fields
 */
const observerPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    type Observer {
      id: UUID!
      name: String!
      email: String!
    }

    extend type Query {
      """
      The currently authenticated user. Returns null if not authenticated.
      """
      observer: Observer
    }
  `,
  resolvers: {
    Query: {
      observer(_source: unknown, _args: unknown, ctx: GraphQLContext) {
        if (!ctx.observer) return null;

        return {
          id: ctx.observer.id,
          name: ctx.observer.name,
          email: ctx.observer.email,
        };
      },
    },
  },
});

export default observerPlugin;
