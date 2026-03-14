type PlanTier = "free" | "pro" | "team";

type PlanRateLimits = {
  requestsPerMinute: number;
  /** Max managed-mode tokens/month (-1 = unlimited, 0 = BYOK only) */
  managedTokenBudget: number;
};

// Gateway rate limits (per-minute enforcement), distinct from monthly tier quotas
// in Omni API plan_feature (kind="operational") → Aether entitlements.
// TODO: fetch from Aether at startup to stay in sync with billing tiers
const PLAN_RATE_LIMITS: Record<PlanTier, PlanRateLimits> = {
  free: {
    requestsPerMinute: 60,
    managedTokenBudget: 0,
  },
  pro: {
    requestsPerMinute: 500,
    managedTokenBudget: 5_000_000,
  },
  team: {
    requestsPerMinute: 2_000,
    managedTokenBudget: 25_000_000,
  },
};

export { PLAN_RATE_LIMITS };
export type { PlanRateLimits, PlanTier };
