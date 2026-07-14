import type { PlanTier } from "lib/config/plans.config";

/**
 * Monthly metered request quotas per plan tier.
 *
 * Mirrors the Omni API catalog (SSOT) at
 * api-stack/services/api/src/lib/db/catalog/planConfigs.ts -> synapse:
 *   - `max_requests_per_month` (-1 = unlimited)
 *   - `overage_rate_per_1k` (cents per 1,000 requests; 0 = hard cap, no overage)
 *
 * When entitlements are available from Aether they take precedence; this is the
 * fallback used when billing is unconfigured or unreachable, and must never be
 * more permissive than the catalog (verified in tests)
 */
type PlanRequestLimit = {
  /** Max metered requests per calendar month (-1 = unlimited) */
  maxRequestsPerMonth: number;
  /** Overage rate in cents per 1,000 requests (0 = hard cap, no overage) */
  overageRatePer1k: number;
};

const PLAN_REQUEST_LIMITS: Record<PlanTier, PlanRequestLimit> = {
  free: {
    maxRequestsPerMonth: 10_000,
    overageRatePer1k: 0,
  },
  pro: {
    maxRequestsPerMonth: 100_000,
    overageRatePer1k: 20,
  },
  team: {
    maxRequestsPerMonth: -1,
    overageRatePer1k: 0,
  },
};

/**
 * Tier-keyed fallback map in the shape expected by `isWithinLimit` from
 * `@omnidotdev/providers/billing` (featureKey -> tier -> limit)
 */
const REQUEST_LIMITS_FALLBACK: Record<string, Record<string, number>> = {
  max_requests_per_month: {
    free: PLAN_REQUEST_LIMITS.free.maxRequestsPerMonth,
    pro: PLAN_REQUEST_LIMITS.pro.maxRequestsPerMonth,
    team: PLAN_REQUEST_LIMITS.team.maxRequestsPerMonth,
  },
};

export { PLAN_REQUEST_LIMITS, REQUEST_LIMITS_FALLBACK };
