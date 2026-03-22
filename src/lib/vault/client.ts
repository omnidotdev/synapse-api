import { createHash } from "node:crypto";

import { GATEKEEPER_SERVICE_KEY, GATEKEEPER_URL } from "lib/config/env.config";

// Fixed namespace for deterministic UUID generation from provider names
const UUID_NAMESPACE = "b8f9a3e1-7c2d-4f5e-8a1b-6d3c9e0f2a4b";

/**
 * Check whether vault proxying is enabled.
 * Requires both GATEKEEPER_URL and GATEKEEPER_SERVICE_KEY to be set.
 */
export const isVaultEnabled = (): boolean =>
  Boolean(GATEKEEPER_URL && GATEKEEPER_SERVICE_KEY);

type VaultKeyMeta = {
  provider: string;
  category: string;
  key_hint: string | null;
  label: string | null;
  model_override: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Generate a deterministic UUID from a provider name.
 * Used to map vault keys (identified by provider) to stable UUIDs
 * for the GraphQL schema.
 */
export const providerToUUID = (provider: string): string => {
  const hash = createHash("sha1")
    .update(`${UUID_NAMESPACE}:${provider}`)
    .digest("hex");

  // Format as UUID v5 (set version and variant bits)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    // Set variant bits (10xx)
    `${((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
};

/**
 * List a user's keys from the Gatekeeper vault
 */
export const listVaultKeys = async (
  accessToken: string,
): Promise<VaultKeyMeta[]> => {
  const res = await fetch(`${GATEKEEPER_URL}/api/vault/keys`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const body = await res.json();

  return body.data ?? [];
};

/**
 * Store a key in the Gatekeeper vault
 */
export const setVaultKey = async (
  accessToken: string,
  params: { provider: string; key: string; modelPreference?: string },
): Promise<{ success: boolean; error?: string }> => {
  const res = await fetch(`${GATEKEEPER_URL}/api/vault/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      provider: params.provider,
      api_key: params.key,
      category: "ai",
      model: params.modelPreference,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    return { success: false, error: body.error ?? "Failed to store key" };
  }

  return { success: true };
};

type ResolvedVaultKey = {
  provider: string;
  key: string;
  model_override: string | null;
};

/**
 * Resolve a decrypted key from the Gatekeeper vault for a specific provider.
 * Uses service-to-service auth (service key + X-User-Id header)
 */
const resolveVaultKey = async (
  userId: string,
  provider: string,
): Promise<ResolvedVaultKey | null> => {
  try {
    const res = await fetch(`${GATEKEEPER_URL}/api/vault/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEKEEPER_SERVICE_KEY}`,
        "X-User-Id": userId,
      },
      body: JSON.stringify({ provider }),
    });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
};

/**
 * Resolve keys for multiple providers from the Gatekeeper vault.
 * Skips providers that return no key
 */
export const resolveVaultKeys = async (
  userId: string,
  providers: string[],
): Promise<ResolvedVaultKey[]> => {
  const results = await Promise.all(
    providers.map((provider) => resolveVaultKey(userId, provider)),
  );

  return results.filter((r): r is ResolvedVaultKey => r !== null);
};

/**
 * Remove a key from the Gatekeeper vault by provider name
 */
export const removeVaultKey = async (
  accessToken: string,
  provider: string,
): Promise<boolean> => {
  const res = await fetch(
    `${GATEKEEPER_URL}/api/vault/keys/${encodeURIComponent(provider)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  return res.ok;
};
