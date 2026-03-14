type PlanTier = "free" | "pro" | "enterprise";

type PlanRateLimits = {
  requestsPerMinute: number;
  tokensPerDay: number;
  tokensPerMonth: number;
};

// Gateway rate limits (per-minute enforcement), distinct from monthly tier quotas
// in Omni API plan_feature (kind="operational") → Aether entitlements.
// TODO: fetch from Aether at startup to stay in sync with billing tiers
const PLAN_RATE_LIMITS: Record<PlanTier, PlanRateLimits> = {
  free: {
    requestsPerMinute: 60,
    tokensPerDay: -1,
    tokensPerMonth: 500_000,
  },
  pro: {
    requestsPerMinute: 500,
    tokensPerDay: -1,
    tokensPerMonth: -1,
  },
  enterprise: {
    requestsPerMinute: 2_000,
    tokensPerDay: -1,
    tokensPerMonth: -1,
  },
};

export { PLAN_RATE_LIMITS };
export type { PlanRateLimits, PlanTier };
