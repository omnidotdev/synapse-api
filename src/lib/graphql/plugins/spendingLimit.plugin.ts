import { EXPORTABLE } from "graphile-export";
import { gql, makeExtendSchemaPlugin } from "graphile-utils";
import { GraphQLError } from "graphql";

import { checkOrgPermission } from "lib/authz/orgPermission";
import {
  SpendingLimitRejectedError,
  spendingLimits,
} from "lib/billing/spendingLimit";
import { isProdEnv } from "lib/config/env.config";
import { authz } from "lib/providers";

import type { GraphQLContext } from "lib/graphql/createGraphqlContext";

/**
 * Map a spending-limit failure to a client-safe GraphQL error: a rejected
 * value is the caller's to fix, anything else is a generic retryable failure
 * (the technical detail is logged, never returned)
 */
const toClientError = EXPORTABLE(
  (GraphQLError, SpendingLimitRejectedError) => (err: unknown) => {
    if (err instanceof SpendingLimitRejectedError) {
      return new GraphQLError(err.message, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    console.error(
      `[spending-limit] ${err instanceof Error ? err.message : "unknown error"}`,
    );

    return new GraphQLError(
      "Spending limits are unavailable right now. Try again shortly",
      { extensions: { code: "SERVICE_UNAVAILABLE" } },
    );
  },
  [GraphQLError, SpendingLimitRejectedError],
);

/**
 * Workspace spending limit: members can view it, admins can change it.
 * Enforced through Warden here, server side; the limit itself lives in Aether
 */
const spendingLimitPlugin = makeExtendSchemaPlugin({
  typeDefs: gql`
    type SpendingLimit {
      organizationId: UUID!
      """
      Hard monthly cap on request overage, in cents (null when unset)
      """
      hardLimitCents: Int
      """
      Overage owed this period, in cents, as last settled
      """
      currentSpendCents: Int!
      """
      Whether requests past the included allowance are paused at the limit
      """
      suspended: Boolean!
    }

    extend type Observer {
      """
      A workspace's Synapse spending limit (workspace members only).
      """
      spendingLimit(organizationId: UUID!): SpendingLimit
    }

    extend type Mutation {
      """
      Set a workspace's hard spending limit in cents (workspace admins only).
      Raising it above the overage already owed resumes paused requests.
      """
      setSpendingLimit(
        organizationId: UUID!
        hardLimitCents: Int!
      ): SpendingLimit!
    }
  `,
  resolvers: {
    Observer: {
      spendingLimit: EXPORTABLE(
        (authz, checkOrgPermission, isProdEnv, spendingLimits, toClientError) =>
          async function spendingLimit(
            observer: { identityProviderId: string },
            args: { organizationId: string },
          ) {
            await checkOrgPermission(
              authz,
              isProdEnv,
              observer,
              args.organizationId,
              "member",
            );

            try {
              return await spendingLimits.getSpendingLimit(args.organizationId);
            } catch (err) {
              throw toClientError(err);
            }
          },
        [authz, checkOrgPermission, isProdEnv, spendingLimits, toClientError],
      ),
    },
    Mutation: {
      setSpendingLimit: EXPORTABLE(
        (
          GraphQLError,
          authz,
          checkOrgPermission,
          isProdEnv,
          spendingLimits,
          toClientError,
        ) =>
          async function setSpendingLimit(
            _source: unknown,
            args: { organizationId: string; hardLimitCents: number },
            ctx: GraphQLContext,
          ) {
            const { observer } = ctx;

            if (!observer) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: "UNAUTHENTICATED" },
              });
            }

            await checkOrgPermission(
              authz,
              isProdEnv,
              observer,
              args.organizationId,
              "admin",
            );

            try {
              return await spendingLimits.setHardLimit(
                args.organizationId,
                args.hardLimitCents,
              );
            } catch (err) {
              throw toClientError(err);
            }
          },
        [
          GraphQLError,
          authz,
          checkOrgPermission,
          isProdEnv,
          spendingLimits,
          toClientError,
        ],
      ),
    },
  },
});

export default spendingLimitPlugin;
