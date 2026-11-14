import {
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
} from "lib/config/env.config";

/**
 * A workspace's Synapse spending limit, read from and written to Aether.
 *
 * The hard limit bounds the request overage a paid workspace can owe in a
 * period: Aether stops letting requests past the included allowance once the
 * owed overage would exceed it, and the invoice never bills above it. Paid
 * tiers start with a default (Pro $100, Team $500) that admins can change
 */

/** Aether rejects a hard limit below $10 */
const MIN_HARD_LIMIT_CENTS = 1000;

/** Upper bound on a hard limit set through Synapse ($100,000/month) */
const MAX_HARD_LIMIT_CENTS = 10_000_000;

const REQUEST_TIMEOUT_MS = 5000;

interface WorkspaceSpendingLimit {
  organizationId: string;
  /** Null when no hard limit is set */
  hardLimitCents: number | null;
  /** Overage owed this period, as last settled by Aether */
  currentSpendCents: number;
  /** Whether requests past the allowance are paused at the limit */
  suspended: boolean;
}

interface AetherConfig {
  baseUrl: string | undefined;
  serviceApiKey: string | undefined;
}

/** Spending limits are unavailable (billing not configured or not answering) */
export class SpendingLimitUnavailableError extends Error {}

/** Aether refused a limit value (e.g. below the minimum) */
export class SpendingLimitRejectedError extends Error {}

const defaultConfig = (): AetherConfig => ({
  baseUrl: BILLING_BASE_URL,
  serviceApiKey: BILLING_SERVICE_API_KEY,
});

const limitUrl = (baseUrl: string, organizationId: string) =>
  `${baseUrl}/spending-limits/synapse/organization/${encodeURIComponent(organizationId)}`;

const toWorkspaceLimit = (
  organizationId: string,
  body: {
    hardLimitCents?: number | null;
    currentSpendCents?: number;
    suspended?: boolean;
  },
): WorkspaceSpendingLimit => ({
  organizationId,
  hardLimitCents: body.hardLimitCents ?? null,
  currentSpendCents: body.currentSpendCents ?? 0,
  suspended: body.suspended ?? false,
});

/**
 * Read a workspace's spending limit. A workspace Aether has no billing account
 * for yet (never subscribed or used Synapse) has no limit and no spend
 */
const getSpendingLimit = async (
  organizationId: string,
  config: AetherConfig = defaultConfig(),
): Promise<WorkspaceSpendingLimit> => {
  if (!config.baseUrl || !config.serviceApiKey) {
    throw new SpendingLimitUnavailableError("billing not configured");
  }

  let response: Response;
  try {
    response = await fetch(limitUrl(config.baseUrl, organizationId), {
      headers: { "x-service-api-key": config.serviceApiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new SpendingLimitUnavailableError(
      err instanceof Error ? err.message : "request failed",
    );
  }

  if (response.status === 404) {
    return toWorkspaceLimit(organizationId, {});
  }

  if (!response.ok) {
    throw new SpendingLimitUnavailableError(
      `Aether returned ${response.status}`,
    );
  }

  return toWorkspaceLimit(organizationId, await response.json());
};

/**
 * Set a workspace's hard spending limit. Aether lifts a spend suspension when
 * the new limit is above the overage already owed
 */
const setHardLimit = async (
  organizationId: string,
  hardLimitCents: number,
  config: AetherConfig = defaultConfig(),
): Promise<WorkspaceSpendingLimit> => {
  if (
    !Number.isInteger(hardLimitCents) ||
    hardLimitCents < MIN_HARD_LIMIT_CENTS ||
    hardLimitCents > MAX_HARD_LIMIT_CENTS
  ) {
    throw new SpendingLimitRejectedError(
      `The spending limit must be between $${MIN_HARD_LIMIT_CENTS / 100} and $${MAX_HARD_LIMIT_CENTS / 100}`,
    );
  }

  if (!config.baseUrl || !config.serviceApiKey) {
    throw new SpendingLimitUnavailableError("billing not configured");
  }

  let response: Response;
  try {
    response = await fetch(limitUrl(config.baseUrl, organizationId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-service-api-key": config.serviceApiKey,
      },
      body: JSON.stringify({ hardLimitCents }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new SpendingLimitUnavailableError(
      err instanceof Error ? err.message : "request failed",
    );
  }

  if (response.status === 400) {
    throw new SpendingLimitRejectedError(
      "The spending limit could not be applied",
    );
  }

  // No billing account yet: the workspace has never subscribed or used Synapse
  if (response.status === 404) {
    throw new SpendingLimitRejectedError(
      "This workspace has no Synapse billing yet",
    );
  }

  if (!response.ok) {
    throw new SpendingLimitUnavailableError(
      `Aether returned ${response.status}`,
    );
  }

  return toWorkspaceLimit(organizationId, await response.json());
};

/** Aether spending limit calls (an object so tests can stub them) */
export const spendingLimits = { getSpendingLimit, setHardLimit };
