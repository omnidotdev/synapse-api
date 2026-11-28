type PlanTier = "free" | "pro" | "team";

type PlanRateLimits = {
  requestsPerMinute: number;
  /**
   * Included managed-mode token budget (catalog `managed_token_budget`). 0 means
   * no included budget: managed usage is pay-as-you-go credits (or BYOK), so no
   * budget threshold applies. A positive value enables the 80% threshold event
   */
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
    managedTokenBudget: 0, // catalog SSOT: managed_token_budget = 0
  },
  pro: {
    requestsPerMinute: 500,
    managedTokenBudget: 0, // catalog SSOT: managed_token_budget = 0 (pay-as-you-go credits)
  },
  team: {
    requestsPerMinute: 2_000,
    managedTokenBudget: 0, // catalog SSOT: managed_token_budget = 0 (pay-as-you-go credits)
  },
};

export type { PlanRateLimits, PlanTier };
export { PLAN_RATE_LIMITS };
