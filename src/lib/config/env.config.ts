/**
 * Environment variables.
 */
export const {
  NODE_ENV,
  PORT = 4000,
  // https://stackoverflow.com/a/68578294
  HOST = "0.0.0.0",
  DATABASE_URL,
  AUTH_BASE_URL = "https://localhost:8000",
  GRAPHQL_MAX_COMPLEXITY_COST,
  CORS_ALLOWED_ORIGINS = "http://localhost:3000",
  /** Secret for verifying auth webhook signatures */
  AUTH_WEBHOOK_SECRET,
  /** Secret for verifying billing webhook signatures */
  BILLING_WEBHOOK_SECRET,
  /** Billing/entitlements service base URL */
  BILLING_BASE_URL,
  /** Service API key for authenticating with Aether */
  BILLING_SERVICE_API_KEY,
  /** Authorization PDP API URL */
  AUTHZ_API_URL,
  /** Enable authorization checks */

  /** Protect GraphQL routes (require authentication) */
  PROTECT_ROUTES,
  /** Secret key for encrypting provider API keys at rest */
  ENCRYPTION_KEY,
  /** Shared secret for authenticating gateway-to-API internal requests */
  GATEWAY_SECRET,
  /** Iggy streaming host */
  IGGY_HOST = "localhost",
  /** Iggy streaming TCP port */
  IGGY_PORT = "8090",
  /** Iggy username */
  IGGY_USERNAME = "iggy",
  /** Iggy password */
  IGGY_PASSWORD = "iggy",
  /** Vortex event streaming API URL */
  VORTEX_API_URL,
  /** Vortex event streaming API key */
  VORTEX_API_KEY,
  /** Auth base URL for vault key proxying */
  AUTH_URL,
  /** Service key for authenticating with Auth */
  AUTH_SERVICE_KEY,
} = process.env;

export const isDevEnv = NODE_ENV === "development",
  isProdEnv = NODE_ENV === "production",
  protectRoutes = PROTECT_ROUTES !== "false";

// Startup warnings for optional integrations
if (!BILLING_BASE_URL)
  console.warn("BILLING_BASE_URL not set, billing disabled");
if (!AUTHZ_API_URL)
  console.warn("AUTHZ_API_URL not set, authorization disabled");
if (!VORTEX_API_URL)
  console.warn("VORTEX_API_URL not set, event streaming disabled");
if (!AUTH_URL) console.warn("AUTH_URL not set, vault key proxying disabled");
