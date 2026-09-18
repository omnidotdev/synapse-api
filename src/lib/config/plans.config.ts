type PlanTier = "free" | "pro" | "team";

type PlanRateLimits = {
  requestsPerMinute: number;
  /** Max managed-mode tokens/month (-1 = unlimited, 0 = BYOK only) */
  managedTokenBudget: number;
};

// Gateway rate limits (per-minute enforcement), distinct from monthly tier quotas
// in Omni API plan_feature (kind="operational") → Aether entitlements.
// These hardcoded defaults are the canonical plan-level rate limits; individual
// overrides are resolved at key-resolution time via Aether's entity-scoped
// entitlements, so there is no plan-template endpoint to sync from at startup
const PLAN_RATE_LIMITS: Record<PlanTier, PlanRateLimits> = {
  free: {
    requestsPerMinute: 60,
    managedTokenBudget: 0, // BYOK only on free tier (catalog SSOT: managed_token_budget = 0)
  },
  pro: {
    requestsPerMinute: 500,
    managedTokenBudget: -1, // unlimited (pay as you go)
  },
  team: {
    requestsPerMinute: 2_000,
    managedTokenBudget: -1, // unlimited (pay as you go)
  },
};

export type { PlanRateLimits, PlanTier };
export { PLAN_RATE_LIMITS };
