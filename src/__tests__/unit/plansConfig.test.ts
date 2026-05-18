import { describe, expect, test } from "bun:test";

import { PLAN_RATE_LIMITS } from "lib/config/plans.config";

/**
 * Validate plan rate limits match expected SSOT values.
 * SSOT source: api-stack/services/api/src/lib/db/catalog/planConfigs.ts
 */
describe("PLAN_RATE_LIMITS", () => {
  test("free tier has correct rate limits", () => {
    expect(PLAN_RATE_LIMITS.free.requestsPerMinute).toBe(60);
    // Free tier managed token budget is ~$1 worth of tokens
    expect(PLAN_RATE_LIMITS.free.managedTokenBudget).toBe(100_000);
  });

  test("pro tier has correct rate limits", () => {
    expect(PLAN_RATE_LIMITS.pro.requestsPerMinute).toBe(500);
    // Pro tier has unlimited (pay as you go) managed tokens
    expect(PLAN_RATE_LIMITS.pro.managedTokenBudget).toBe(-1);
  });

  test("team tier has correct rate limits", () => {
    expect(PLAN_RATE_LIMITS.team.requestsPerMinute).toBe(2_000);
    expect(PLAN_RATE_LIMITS.team.managedTokenBudget).toBe(-1);
  });

  test("all tiers have positive requestsPerMinute", () => {
    for (const [, limits] of Object.entries(PLAN_RATE_LIMITS)) {
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
    }
  });

  test("rate limits increase with tier", () => {
    expect(PLAN_RATE_LIMITS.pro.requestsPerMinute).toBeGreaterThan(
      PLAN_RATE_LIMITS.free.requestsPerMinute,
    );
    expect(PLAN_RATE_LIMITS.team.requestsPerMinute).toBeGreaterThan(
      PLAN_RATE_LIMITS.pro.requestsPerMinute,
    );
  });
});
