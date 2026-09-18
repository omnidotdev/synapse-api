import { describe, expect, mock, test } from "bun:test";
import { GraphQLError } from "graphql";

/**
 * Fail-closed authorization guarantees.
 *
 * These assert the two places where a missing authorization configuration
 * must DENY rather than silently allow in production:
 *
 *  1. Boot check (mirrors src/server.ts): the server refuses to start in
 *     production when AUTHZ_API_URL is unset, but only warns in development.
 *  2. Deny path (mirrors assertOrgPermission in apiKeys.plugin.ts and
 *     workspaces.plugin.ts): when the authz client is absent, org/workspace
 *     permission checks throw FORBIDDEN in production and no-op in development.
 *
 * The logic is mirrored (not imported) because the real boot check runs at
 * module load in server.ts and the real assertOrgPermission is an EXPORTABLE
 * closure over the authz singleton, neither of which is importable in isolation.
 */

// ── 1. Boot check (mirrors src/server.ts) ──────────────────────────────

/**
 * Assert authorization is configured, mirroring the boot guard in server.ts.
 * Throws in production when the authz API URL is missing (fail closed).
 */
const assertAuthzConfiguredAtBoot = (
  authzApiUrl: string | undefined,
  isProd: boolean,
) => {
  if (!authzApiUrl) {
    if (isProd) {
      throw new Error(
        "[AuthZ] AUTHZ_API_URL is required in production, refusing to boot with authorization disabled",
      );
    }

    return "warn";
  }

  return "ok";
};

describe("authz boot check (fail closed)", () => {
  test("throws in production when AUTHZ_API_URL is unset", () => {
    expect(() => assertAuthzConfiguredAtBoot(undefined, true)).toThrow(
      "AUTHZ_API_URL is required in production",
    );
  });

  test("warns (does not throw) in development when AUTHZ_API_URL is unset", () => {
    expect(assertAuthzConfiguredAtBoot(undefined, false)).toBe("warn");
  });

  test("boots normally when AUTHZ_API_URL is set", () => {
    expect(assertAuthzConfiguredAtBoot("https://warden.omni.dev", true)).toBe(
      "ok",
    );
  });
});

// ── 2. Deny path (mirrors assertOrgPermission in the plugins) ──────────

type AuthzClient = {
  checkPermission: (
    userId: string,
    objectType: string,
    objectId: string,
    action: string,
  ) => Promise<boolean>;
} | null;

/**
 * Assert org permission, mirroring assertOrgPermission in apiKeys.plugin.ts
 * and workspaces.plugin.ts. Fails closed in production when authz is absent.
 */
const assertOrgPermission = async (
  authz: AuthzClient,
  isProd: boolean,
  userId: string,
  organizationId: string,
  action: string,
) => {
  if (!authz) {
    if (isProd) {
      throw new GraphQLError("Insufficient permissions", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    return;
  }

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

describe("assertOrgPermission (fail closed)", () => {
  test("denies with FORBIDDEN in production when authz client is absent", async () => {
    await expect(
      assertOrgPermission(null, true, "user-1", "org-1", "admin"),
    ).rejects.toThrow("Insufficient permissions");
  });

  test("does not leak that authz is unavailable in the denial message", async () => {
    await expect(
      assertOrgPermission(null, true, "user-1", "org-1", "admin"),
    ).rejects.toThrow(GraphQLError);

    // The production denial is a generic FORBIDDEN, not "requires <action>"
    // (which would only surface from a live authz decision)
    await expect(
      assertOrgPermission(null, true, "user-1", "org-1", "admin"),
    ).rejects.not.toThrow("requires admin");
  });

  test("no-ops in development when authz client is absent", async () => {
    await expect(
      assertOrgPermission(null, false, "user-1", "org-1", "admin"),
    ).resolves.toBeUndefined();
  });

  test("delegates to the authz client when present and grants access", async () => {
    const authz = { checkPermission: mock(async () => true) };

    await expect(
      assertOrgPermission(authz, true, "user-1", "org-1", "admin"),
    ).resolves.toBeUndefined();

    expect(authz.checkPermission).toHaveBeenCalledWith(
      "user-1",
      "organization",
      "org-1",
      "admin",
    );
  });

  test("throws when the authz client denies the permission", async () => {
    const authz = { checkPermission: mock(async () => false) };

    await expect(
      assertOrgPermission(authz, true, "user-1", "org-1", "admin"),
    ).rejects.toThrow("Insufficient permissions: requires admin");
  });
});
