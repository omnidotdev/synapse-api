import { describe, expect, test } from "bun:test";

import type { EntitlementsResponse } from "@omnidotdev/providers/billing";

/**
 * Mirror of the resolveRetentionDays helper in usageAggregation.plugin.ts.
 * Kept here so the entitlement enforcement contract is verified independently
 * of GraphQL plumbing.
 */
const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  free: 7,
  pro: 90,
  team: 365,
};

const resolveRetentionDays = (
  entitlements: EntitlementsResponse | null,
  tier: string,
): number => {
  const entry = entitlements?.entitlements?.find(
    (e) => e.featureKey === "analytics_retention_days",
  );

  if (entry?.value != null) {
    const val = Number(String(entry.value).replace(/"/g, ""));
    if (Number.isFinite(val)) {
      return val === -1 ? 366 : val;
    }
  }

  return DEFAULT_RETENTION_DAYS[tier] ?? DEFAULT_RETENTION_DAYS.free;
};

describe("analytics_retention_days enforcement", () => {
  test("free tier defaults to 7 days when entitlements absent", () => {
    expect(resolveRetentionDays(null, "free")).toBe(7);
  });

  test("pro tier defaults to 90 days when entitlements absent", () => {
    expect(resolveRetentionDays(null, "pro")).toBe(90);
  });

  test("team tier defaults to 365 days when entitlements absent", () => {
    expect(resolveRetentionDays(null, "team")).toBe(365);
  });

  test("uses entitlement value when present", () => {
    const entitlements = {
      entitlements: [{ featureKey: "analytics_retention_days", value: 90 }],
    } as unknown as EntitlementsResponse;

    expect(resolveRetentionDays(entitlements, "free")).toBe(90);
  });

  test("treats -1 entitlement value as 366 days (effective unlimited)", () => {
    const entitlements = {
      entitlements: [{ featureKey: "analytics_retention_days", value: -1 }],
    } as unknown as EntitlementsResponse;

    expect(resolveRetentionDays(entitlements, "team")).toBe(366);
  });

  test("falls back to tier default when entitlement value is unparseable", () => {
    const entitlements = {
      entitlements: [
        { featureKey: "analytics_retention_days", value: "garbage" },
      ],
    } as unknown as EntitlementsResponse;

    expect(resolveRetentionDays(entitlements, "pro")).toBe(90);
  });

  test("strips quotes from string entitlement values", () => {
    const entitlements = {
      entitlements: [
        { featureKey: "analytics_retention_days", value: '"90"' },
      ],
    } as unknown as EntitlementsResponse;

    expect(resolveRetentionDays(entitlements, "free")).toBe(90);
  });

  test("free tier (7 days) blocks queries for 30-day windows", () => {
    const retention = resolveRetentionDays(null, "free");
    const earliestAllowed = new Date(Date.now() - retention * 86_400_000);
    const requestedStart = new Date(Date.now() - 30 * 86_400_000);

    expect(requestedStart < earliestAllowed).toBe(true);
  });

  test("team tier (365 days) allows queries for 90-day windows", () => {
    const retention = resolveRetentionDays(null, "team");
    const earliestAllowed = new Date(Date.now() - retention * 86_400_000);
    const requestedStart = new Date(Date.now() - 90 * 86_400_000);

    expect(requestedStart >= earliestAllowed).toBe(true);
  });
});
