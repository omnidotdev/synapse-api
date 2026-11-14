/**
 * Provider configs for Aether billing and Warden authorization.
 *
 * Both services reject unauthenticated service calls (401), so each config
 * carries its service key. Without the billing key, every entitlement lookup
 * silently failed and was treated as "no data" (plan checks fell back to the
 * persisted plan); without the authz key, every workspace permission check
 * threw.
 */

/** Aether billing provider config, or the noop provider when unset */
export const billingProviderConfig = (
  baseUrl: string | undefined,
  serviceApiKey: string | undefined,
) =>
  baseUrl
    ? {
        provider: "aether" as const,
        baseUrl,
        appId: "synapse",
        serviceApiKey,
      }
    : {};

/** Warden authz provider config, or null when authorization is not configured */
export const authzProviderConfig = (
  apiUrl: string | undefined,
  serviceKey: string | undefined,
) => (apiUrl ? { apiUrl, serviceKey, source: "synapse" } : null);
