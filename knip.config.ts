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
    "src/__tests__/**",
    // reference scaffolding retained for imminent adoption
    "src/lib/auth/**",
    "src/lib/cache/**",
    "src/lib/crypto/**",
    "src/lib/db/scoped.ts",
    "src/lib/db/dbClient.ts",
    "src/lib/db/pgClient.ts",
    "src/lib/idp/**",
    "src/lib/logging/**",
    "src/lib/middleware/**",
    "src/lib/providers/**",
  ],
  ignoreDependencies: [
    // GitHub dependency not resolvable by knip
    "@omnidotdev/providers",
    "@changesets/changelog-github",
    "@changesets/cli",
    "drizzle-kit",
    // TODO switch to testcontainers (unstable behavior with Bun/Docker), then remove below
    "@testcontainers/postgresql",
    "testcontainers",
    "@faker-js/faker",
  ],
  ignoreBinaries: [
    "tsc", // Bun provides TypeScript compilation
  ],
  tags: ["-knipignore"],
};

export default knipConfig;
