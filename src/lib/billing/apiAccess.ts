import {
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
} from "lib/config/env.config";

/**
 * `granted` / `denied` are Aether's answer; `unavailable` means billing is not
 * configured or did not answer, so the caller decides whether to fail open
 */
type ApiAccessVerdict = "granted" | "denied" | "unavailable";

const REQUEST_TIMEOUT_MS = 5000;

interface AetherConfig {
  baseUrl: string | undefined;
  serviceApiKey: string | undefined;
}

/**
 * Check the `api_access` entitlement for an entity under a product through
 * Aether's value-aware check route. The route also provisions the entity's
 * free tier (entitlements plus the free credit grant) on first contact, so a
 * brand-new product user exists in Aether before their key is handed out
 * @param appId - Aether app the access is for
 * @param entityType - `user` or `organization`
 * @param entityId - Entity UUID
 * @param config - Aether endpoint and service key (defaults to the env)
 */
const checkApiAccess = async (
  appId: string,
  entityType: string,
  entityId: string,
  config: AetherConfig = {
    baseUrl: BILLING_BASE_URL,
    serviceApiKey: BILLING_SERVICE_API_KEY,
  },
): Promise<ApiAccessVerdict> => {
  if (!config.baseUrl || !config.serviceApiKey) return "unavailable";

  const path = [appId, entityType, entityId, "api_access", "check"]
    .map(encodeURIComponent)
    .join("/");

  try {
    const response = await fetch(`${config.baseUrl}/entitlements/${path}`, {
      headers: { "x-service-api-key": config.serviceApiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[api-access] Aether check returned ${response.status}`);
      return "unavailable";
    }

    const body = (await response.json()) as { hasEntitlement?: unknown };
    return body.hasEntitlement === true ? "granted" : "denied";
  } catch (err) {
    console.error(
      `[api-access] Aether check failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return "unavailable";
  }
};

/** Aether access checks (an object so tests can stub them) */
export const aetherAccess = { checkApiAccess };
