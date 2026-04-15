/**
 * IDP organization membership validation.
 *
 * Verify that a user belongs to a given organization via the IDP.
 * Uses caching and fail-open circuit breaker for resilience.
 */

import { AUTH_BASE_URL, AUTH_SERVICE_KEY } from "lib/config/env.config";
import { CACHE_TTL_MS } from "./orgCache";

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 3000;

/** Maximum cache entries before eviction */
const MAX_CACHE_SIZE = 10_000;

/** Cache for membership checks, keyed by `userId:organizationId` */
const membershipCache = new Map<
  string,
  { isMember: boolean; expiresAt: number }
>();

/**
 * Check if a user is a member of an organization in the IDP.
 *
 * - Caches positive results for 5 minutes
 * - Does NOT cache negative results (membership might be in propagation delay)
 * - Fails open if IDP is unavailable (logs warning, returns true)
 *
 * @param userId - The identity provider user ID to check
 * @param organizationId - The organization ID to validate membership against
 * @returns true if member or IDP unavailable, false if confirmed non-member
 */
const validateOrgMembership = async (
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  if (!AUTH_BASE_URL) {
    console.warn(
      "[IDP] `AUTH_BASE_URL` not configured, skipping membership validation",
    );
    return true; // fail open
  }

  const cacheKey = `${userId}:${organizationId}`;

  // check cache first
  const cached = membershipCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.isMember;

  try {
    // Query IDP for organization members and check if user is in the list
    const response = await fetch(
      `${AUTH_BASE_URL}/api/organization/members?orgId=${organizationId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(AUTH_SERVICE_KEY && {
            "x-service-api-key": AUTH_SERVICE_KEY,
          }),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (response.ok) {
      const body = (await response.json()) as {
        data?: { userId: string }[];
      };
      const members = body.data ?? [];
      const isMember = members.some((m) => m.userId === userId);

      if (isMember) {
        // Evict all entries if cache is too large
        if (membershipCache.size >= MAX_CACHE_SIZE) {
          membershipCache.clear();
        }

        // cache positive result
        membershipCache.set(cacheKey, {
          isMember: true,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      } else {
        console.warn(
          `[IDP] User ${userId} is not a member of organization ${organizationId}`,
        );
      }

      return isMember;
    }

    if (response.status === 404) {
      // org doesn't exist
      console.warn(
        `[IDP] Organization ${organizationId} not found when checking membership`,
      );
      return false;
    }

    // other error status - fail open
    console.warn(
      `[IDP] Unexpected response checking membership for user ${userId} in org ${organizationId}: ${response.status}`,
    );
    return true;
  } catch (err) {
    // network error or timeout - fail open
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[IDP] Failed to validate membership for user ${userId} in org ${organizationId}, failing open: ${message}`,
    );
    return true;
  }
};

/** Clear the membership cache (useful for testing) */
export const clearMembershipCache = () => membershipCache.clear();

export default validateOrgMembership;
