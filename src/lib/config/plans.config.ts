type PlanTier = "free" | "pro" | "team" | "enterprise";

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
    requestsPerMinute: 200,
    tokensPerDay: 200_000,
    tokensPerMonth: 6_000_000,
  },
  team: {
    requestsPerMinute: 500,
    tokensPerDay: 1_000_000,
    tokensPerMonth: 30_000_000,
  },
  enterprise: {
    requestsPerMinute: 2_000,
    tokensPerDay: -1,
    tokensPerMonth: -1,
  },
};

export { PLAN_RATE_LIMITS };
export type { PlanRateLimits, PlanTier };
