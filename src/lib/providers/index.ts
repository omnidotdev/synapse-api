/**
 * Shared provider instances.
 *
 * Instantiates authorization and billing providers from @omnidotdev/providers
 * with app-specific configuration from environment variables.
 */

import { createAuthzProvider } from "@omnidotdev/providers/authz";
import { createBillingProvider } from "@omnidotdev/providers/billing";
import { createEventsProvider } from "@omnidotdev/providers/events";

import {
  AUTHZ_API_URL,
  AUTHZ_SERVICE_KEY,
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
  VORTEX_API_KEY,
  VORTEX_API_URL,
} from "lib/config/env.config";
import { authzProviderConfig, billingProviderConfig } from "./config";

const authzConfig = authzProviderConfig(AUTHZ_API_URL, AUTHZ_SERVICE_KEY);

export const authz = authzConfig ? createAuthzProvider(authzConfig) : null;

export const billing = createBillingProvider(
  billingProviderConfig(BILLING_BASE_URL, BILLING_SERVICE_API_KEY),
);

export const events = createEventsProvider(
  VORTEX_API_URL && VORTEX_API_KEY
    ? {
        provider: "http",
        baseUrl: VORTEX_API_URL,
        apiKey: VORTEX_API_KEY,
        source: "omni.synapse",
      }
    : {},
);
