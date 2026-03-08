type PlanTier = "free" | "pro" | "enterprise";

type PlanRateLimits = {
  requestsPerMinute: number;
  tokensPerDay: number;
  tokensPerMonth: number;
};

const PLAN_RATE_LIMITS: Record<PlanTier, PlanRateLimits> = {
  free: {
    requestsPerMinute: 20,
    tokensPerDay: 16_000,
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
