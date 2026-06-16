import { billing } from "lib/providers";

interface TenantContext {
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  /** Identity provider ID for entitlement lookups (user.identityProviderId) */
  userIdpId?: string;
  requestId?: string;
}

interface AuditEvent {
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
}

/**
 * Check whether audit_logs entitlement is enabled for the given entity.
 * Prefers organization-scoped check when available, otherwise falls back
 * to the user. Returns true (enabled) when no Aether result is available
 * so on-disk audit trails are not silently lost during outages.
 */
const isAuditEnabled = async (context: TenantContext): Promise<boolean> => {
  const checks: Array<{
    entityType: "organization" | "user";
    entityId: string;
  }> = [];

  if (context.organizationId) {
    checks.push({
      entityType: "organization",
      entityId: context.organizationId,
    });
  }

  if (context.userIdpId) {
    checks.push({ entityType: "user", entityId: context.userIdpId });
  }

  for (const { entityType, entityId } of checks) {
    const entitlements = await billing
      .getEntitlements(entityType, entityId, "synapse")
      .catch(() => null);

    const entry = entitlements?.entitlements?.find(
      (e) => e.featureKey === "audit_logs",
    );

    if (entry?.value != null) {
      return Number(entry.value) !== 0;
    }
  }

  // No entitlement info available, fail-open so audit trails persist
  return true;
};

/**
 * Log an audit event for compliance tracking.
 *
 * Gated by the `audit_logs` entitlement: if the tenant's plan does not
 * include audit logs, this is a no-op. Required for SOC2 / compliance
 * customers on the Team tier.
 */
const logAuditEvent = async (context: TenantContext, evt: AuditEvent) => {
  if (!(await isAuditEnabled(context))) return;

  const entry = {
    level: "audit",
    timestamp: new Date().toISOString(),
    tenant: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      userId: context.userId,
    },
    requestId: context.requestId,
    action: evt.action,
    resource: evt.resource,
    resourceId: evt.resourceId,
    details: evt.details,
  };

  // biome-ignore lint/suspicious/noConsole: audit log output
  console.log(JSON.stringify(entry));
};

export default logAuditEvent;
