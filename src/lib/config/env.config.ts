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
  CORS_ALLOWED_ORIGINS,
  /** Secret for verifying auth webhook signatures */
  AUTH_WEBHOOK_SECRET,
  /** Secret for verifying billing webhook signatures */
  BILLING_WEBHOOK_SECRET,
  /** Billing/entitlements service base URL */
  BILLING_BASE_URL,
  /** Service API key for authenticating with Aether */
  AETHER_SERVICE_API_KEY,
  /** Authorization PDP API URL */
  AUTHZ_API_URL,
  /** Enable authorization checks */
  AUTHZ_ENABLED,
  /** Protect GraphQL routes (require authentication) */
  PROTECT_ROUTES,
  /** Secret key for encrypting provider API keys at rest */
  ENCRYPTION_KEY,
  /** Shared secret for authenticating gateway-to-API internal requests */
  GATEWAY_SECRET,
} = process.env;

export const isDevEnv = NODE_ENV === "development",
  isProdEnv = NODE_ENV === "production",
  protectRoutes = PROTECT_ROUTES === "true";
