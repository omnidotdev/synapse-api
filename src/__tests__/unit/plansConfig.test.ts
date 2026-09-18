import { describe, expect, test } from "bun:test";

import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import {
  ANALYTICS_RETENTION_DAYS,
  MAX_API_KEYS,
  MAX_PROVIDER_KEYS,
  MAX_WORKSPACES,
} from "lib/config/planLimits.config";
import { PLAN_REQUEST_LIMITS } from "lib/config/requestLimits.config";

/**
 * Catalog parity guard.
 *
 * Pins the synapse tier values from the Omni API catalog (SSOT) at
 * api-stack/services/api/src/lib/db/catalog/planConfigs.ts and asserts that
 * synapse-api's local runtime fallback config matches them exactly. The catalog
 * is authoritative: when it changes, update these constants and the runtime
 * config together, so any drift fails this test loudly.
 *
 * DB-free: imports only plain config modules (no env.config, no db, no
 * providers), so it runs without the Postgres test container.
 */

/** Frozen copy of the synapse catalog SSOT (values owned by omni-api planConfigs.ts) */
const CATALOG_SSOT = {
  free: {
    monthlyPriceCents: 0,
    max_requests_per_month: 10_000,
    overage_rate_per_1k: 0,
    requests_per_minute: 60,
    max_api_keys: 3,
    max_provider_keys: 6,
    max_workspaces: 1,
    analytics_retention_days: 7,
    managed_token_budget: 0,
  },
  pro: {
    monthlyPriceCents: 2_900,
    max_requests_per_month: 100_000,
    overage_rate_per_1k: 20,
    requests_per_minute: 500,
    max_api_keys: 25,
    max_provider_keys: 10,
    max_workspaces: 10,
    analytics_retention_days: 90,
  },
  team: {
    monthlyPriceCents: 7_900,
    max_requests_per_month: -1,
    overage_rate_per_1k: 0,
    requests_per_minute: 2_000,
    max_api_keys: -1,
    max_provider_keys: -1,
    max_workspaces: -1,
    analytics_retention_days: 365,
  },
} as const;

const TIERS = ["free", "pro", "team"] as const;

describe("synapse catalog parity", () => {
  describe("requests_per_minute (plans.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(PLAN_RATE_LIMITS[tier].requestsPerMinute).toBe(
          CATALOG_SSOT[tier].requests_per_minute,
        );
      });
    }
  });

  describe("managed_token_budget (plans.config.ts)", () => {
    test("free is BYOK only (0), matching catalog SSOT", () => {
      expect(PLAN_RATE_LIMITS.free.managedTokenBudget).toBe(
        CATALOG_SSOT.free.managed_token_budget,
      );
    });

    // Paid tiers meter managed usage as unlimited pay-as-you-go at runtime (-1),
    // billed via overage rather than a fixed monthly token budget
    test("pro and team are unlimited pay-as-you-go (-1)", () => {
      expect(PLAN_RATE_LIMITS.pro.managedTokenBudget).toBe(-1);
      expect(PLAN_RATE_LIMITS.team.managedTokenBudget).toBe(-1);
    });
  });

  describe("max_requests_per_month (requestLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(PLAN_REQUEST_LIMITS[tier].maxRequestsPerMonth).toBe(
          CATALOG_SSOT[tier].max_requests_per_month,
        );
      });
    }
  });

  describe("overage_rate_per_1k (requestLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(PLAN_REQUEST_LIMITS[tier].overageRatePer1k).toBe(
          CATALOG_SSOT[tier].overage_rate_per_1k,
        );
      });
    }
  });

  describe("max_api_keys (planLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(MAX_API_KEYS[tier]).toBe(CATALOG_SSOT[tier].max_api_keys);
      });
    }
  });

  describe("max_provider_keys (planLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(MAX_PROVIDER_KEYS[tier]).toBe(
          CATALOG_SSOT[tier].max_provider_keys,
        );
      });
    }
  });

  describe("max_workspaces (planLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(MAX_WORKSPACES[tier]).toBe(CATALOG_SSOT[tier].max_workspaces);
      });
    }
  });

  describe("analytics_retention_days (planLimits.config.ts)", () => {
    for (const tier of TIERS) {
      test(`${tier} matches catalog SSOT`, () => {
        expect(ANALYTICS_RETENTION_DAYS[tier]).toBe(
          CATALOG_SSOT[tier].analytics_retention_days,
        );
      });
    }
  });

  // Prices are catalog-owned and synced to Stripe by Mosaic. synapse-api holds no
  // local price config, so there is no runtime value to compare here; the SSOT
  // prices are pinned so any catalog change is a deliberate edit to this guard
  describe("monthly prices (catalog + Stripe via Mosaic, no synapse-api runtime)", () => {
    test("catalog prices are $0 / $29 / $79", () => {
      expect(CATALOG_SSOT.free.monthlyPriceCents).toBe(0);
      expect(CATALOG_SSOT.pro.monthlyPriceCents).toBe(2_900);
      expect(CATALOG_SSOT.team.monthlyPriceCents).toBe(7_900);
    });
  });
});
