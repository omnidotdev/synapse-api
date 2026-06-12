import type { KnipConfig } from "knip";

/**
 * Knip configuration.
 * @see https://knip.dev/overview/configuration
 */
const knipConfig: KnipConfig = {
  ignore: [
    "**/generated/**",
    "scripts/**",
    "src/lib/config/drizzle.config.ts",
    "src/lib/config/plans.config.ts",
    "src/scripts/**",
    "src/lib/config/env.config.ts",
    "src/test/**",
    // reference scaffolding retained for imminent adoption
    "src/lib/cache/**",
    "src/lib/db/scoped.ts",
    "src/lib/db/dbClient.ts",
    "src/lib/db/pgClient.ts",
    "src/lib/idp/**",
    "src/lib/logging/**",
    "src/lib/middleware/**",
    // Instrumentation loaded via --import flag at runtime
    "src/instrumentation.ts",
  ],
  ignoreDependencies: [
    "@changesets/cli",
    "drizzle-kit",
    // TODO switch to testcontainers (unstable behavior with Bun/Docker), then remove below
    "@testcontainers/postgresql",
    "testcontainers",
    // OpenTelemetry deps used by instrumentation.ts (loaded via --import)
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/exporter-logs-otlp-http",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-logs",
    "@opentelemetry/sdk-node",
    "@opentelemetry/semantic-conventions",
  ],
  ignoreBinaries: [
    "tsc", // Bun provides TypeScript compilation
  ],
  tags: ["-knipignore"],
};

export default knipConfig;
