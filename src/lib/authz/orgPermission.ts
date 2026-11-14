import { GraphQLError } from "graphql";

import type { WardenRelation } from "@omnidotdev/providers";

/** The slice of the Warden client an organization permission check needs */
interface OrgPermissionChecker {
  checkPermission: (
    userId: string,
    resourceType: "organization",
    resourceId: string,
    permission: WardenRelation<"organization">,
  ) => Promise<boolean>;
}

/**
 * Assert the observer holds a permission on an organization via Warden.
 *
 * Warden keys organization roles by the identity provider (Gatekeeper) user
 * id, so the check always uses `identityProviderId`, never Synapse's own user
 * row id (which Warden has never heard of and would always deny). Fails
 * closed in production: an absent authz client denies rather than silently
 * allowing. In development it no-ops when unconfigured
 */
export const checkOrgPermission = async (
  authz: OrgPermissionChecker | null | undefined,
  isProd: boolean,
  observer: { identityProviderId: string },
  organizationId: string,
  action: WardenRelation<"organization">,
): Promise<void> => {
  if (!authz) {
    if (isProd) {
      throw new GraphQLError("Insufficient permissions", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    return;
  }

  const allowed = await authz.checkPermission(
    observer.identityProviderId,
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
