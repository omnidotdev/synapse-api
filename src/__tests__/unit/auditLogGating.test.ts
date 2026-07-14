import { randomBytes } from "node:crypto";

// ENCRYPTION_KEY must be set before importing any crypto-touching module
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { logAuditEvent } from "lib/logging";
import { billing } from "lib/providers";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

describe("logAuditEvent gating by audit_logs entitlement", () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noConsole: restore stub
    (console.log as unknown as { mockRestore?: () => void }).mockRestore?.();
  });

  test("emits log when audit_logs entitlement is 1", async () => {
    const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
      entitlements: [{ featureKey: "audit_logs", value: 1 }],
    } as unknown as EntitlementsResponse);

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await logAuditEvent(
      {
        organizationId: "org-1",
        userId: "user-1",
        userIdpId: "idp-1",
      },
      { action: "api_key.created", resource: "api_key", resourceId: "key-1" },
    );

    expect(logSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(payload.action).toBe("api_key.created");
    expect(payload.level).toBe("audit");

    logSpy.mockRestore();
    getEntitlementsSpy.mockRestore();
  });

  test("skips log when audit_logs entitlement is 0", async () => {
    const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
      entitlements: [{ featureKey: "audit_logs", value: 0 }],
    } as unknown as EntitlementsResponse);

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await logAuditEvent(
      { organizationId: "org-1" },
      { action: "workspace.created", resource: "workspace", resourceId: "ws-1" },
    );

    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    getEntitlementsSpy.mockRestore();
  });

  test("fails open and emits log when Aether is unreachable", async () => {
    const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockRejectedValue(
      new Error("aether down"),
    );

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await logAuditEvent(
      { organizationId: "org-1" },
      { action: "workspace.deleted", resource: "workspace", resourceId: "ws-1" },
    );

    // Fail-open: when entitlement lookup fails we still emit (compliance default)
    expect(logSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    getEntitlementsSpy.mockRestore();
  });

  test("falls back to user-scoped check when organizationId is absent", async () => {
    const getEntitlementsSpy = spyOn(billing, "getEntitlements").mockResolvedValue({
      entitlements: [{ featureKey: "audit_logs", value: 0 }],
    } as unknown as EntitlementsResponse);

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await logAuditEvent(
      { userIdpId: "idp-1" },
      { action: "api_key.revoked", resource: "api_key", resourceId: "key-1" },
    );

    expect(getEntitlementsSpy).toHaveBeenCalledWith("user", "idp-1", "synapse");
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    getEntitlementsSpy.mockRestore();
  });
});
