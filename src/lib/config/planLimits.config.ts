/**
 * Fallback operational limits, applied when Aether entitlements are unreachable.
 *
 * Mirrors the Omni API catalog (SSOT) synapse tier `operationalLimits` at
 * api-stack/services/api/src/lib/db/catalog/planConfigs.ts. When entitlements
 * are available from Aether they take precedence; these are the fallback used
 * when billing is unconfigured or unreachable, and must never be more permissive
 * than the catalog (verified in plansConfig.test.ts).
 *
 * A value of -1 means unlimited.
 */
type TierLimit = Record<string, number>;

/** Max user-owned (non-managed) API keys per tier (catalog `max_api_keys`) */
const MAX_API_KEYS: TierLimit = { free: 3, pro: 25, team: -1 };

/** Max stored upstream provider keys per tier (catalog `max_provider_keys`) */
const MAX_PROVIDER_KEYS: TierLimit = { free: 6, pro: 10, team: -1 };

/** Max workspaces per tier (catalog `max_workspaces`) */
const MAX_WORKSPACES: TierLimit = { free: 1, pro: 10, team: -1 };

/** Analytics history retention window in days per tier (catalog `analytics_retention_days`) */
const ANALYTICS_RETENTION_DAYS: TierLimit = { free: 7, pro: 90, team: 365 };

export {
  ANALYTICS_RETENTION_DAYS,
  MAX_API_KEYS,
  MAX_PROVIDER_KEYS,
  MAX_WORKSPACES,
};
