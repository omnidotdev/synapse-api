import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { EXPORTABLE, exportSchema } from "graphile-export";
import { GraphQLError, printSchema } from "graphql";
import { makeSchema } from "postgraphile";

import graphilePreset from "lib/config/graphile.config";
import { encrypt, generateApiKey } from "lib/crypto";
import {
  apiKeyProviderTable,
  apiKeyTable,
  providerKeyTable,
  usageEventTable,
  userPreferenceTable,
  workspaceTable,
} from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { validateOrgMembership } from "lib/idp";
import { logAuditEvent } from "lib/logging";
import { authz, billing, events } from "lib/providers";
import {
  isVaultEnabled,
  listVaultKeys,
  providerToUUID,
  removeVaultKey,
  setVaultKey,
} from "lib/vault/client";

const CACHE_DIR = `${__dirname}/../../.cache`;
const HASH_FILE = `${CACHE_DIR}/schema-hash`;
const SCHEMA_DIR = `${__dirname}/../lib/db/schema`;
const PLUGINS_DIR = `${__dirname}/../lib/graphql/plugins`;
const GRAPHILE_CONFIG = `${__dirname}/../lib/config/graphile.config.ts`;

/**
 * Compute hash of all files that influence the generated GraphQL schema:
 * DB schema tables, GraphQL plugins, and the Graphile preset config.
 */
const computeSchemaHash = (): string => {
  const hash = createHash("sha256");

  // Hash DB schema files
  const schemaFiles = readdirSync(SCHEMA_DIR, { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))
    .sort();

  for (const file of schemaFiles) {
    const content = readFileSync(join(SCHEMA_DIR, file));
    hash.update(`schema:${file}`);
    hash.update(content);
  }

  // Hash GraphQL plugin files
  const pluginFiles = readdirSync(PLUGINS_DIR, { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))
    .sort();

  for (const file of pluginFiles) {
    const content = readFileSync(join(PLUGINS_DIR, file));
    hash.update(`plugin:${file}`);
    hash.update(content);
  }

  // Hash graphile config
  if (existsSync(GRAPHILE_CONFIG)) {
    hash.update("config:graphile.config.ts");
    hash.update(readFileSync(GRAPHILE_CONFIG));
  }

  return hash.digest("hex");
};

/**
 * Check if schema has changed since last generation.
 */
const hasSchemaChanged = (): boolean => {
  if (!existsSync(HASH_FILE)) return true;

  const currentHash = computeSchemaHash();
  const storedHash = readFileSync(HASH_FILE, "utf-8").trim();

  return currentHash !== storedHash;
};

/**
 * Generate a GraphQL schema from a Postgres database.
 * @see https://postgraphile.org/postgraphile/next/exporting-schema
 */
const generateGraphqlSchema = async () => {
  // skip if schema unchanged
  if (!hasSchemaChanged()) {
    console.info("[graphql:generate] Schema unchanged, skipping generation");
    return;
  }

  const { schema } = await makeSchema(graphilePreset);

  const generatedDirectory = `${__dirname}/../generated/graphql`;
  const schemaFilePath = `${generatedDirectory}/schema.executable.ts`;

  // create artifacts directory if it doesn't exist
  if (!existsSync(generatedDirectory))
    mkdirSync(generatedDirectory, { recursive: true });

  await exportSchema(schema, schemaFilePath, {
    mode: "typeDefs",
    modules: {
      "graphile-export": { EXPORTABLE },
      "@omnidotdev/providers/billing": { isWithinLimit },
      "drizzle-orm": { and, desc, eq, gte, isNull, lte, ne, sql },
      graphql: { GraphQLError },
      "lib/crypto": { encrypt, generateApiKey },
      "lib/db/schema": {
        apiKeyProviderTable,
        apiKeyTable,
        providerKeyTable,
        usageEventTable,
        userPreferenceTable,
        workspaceTable,
      },
      "lib/events/publisher": { publish },
      "lib/idp": { validateOrgMembership },
      "lib/logging": { logAuditEvent },
      "lib/providers": { authz, billing, events },
      "lib/vault/client": {
        isVaultEnabled,
        listVaultKeys,
        providerToUUID,
        removeVaultKey,
        setVaultKey,
      },
    },
  });

  // Prepend `// @ts-nocheck` to suppress strict checking on generated code
  const generated = readFileSync(schemaFilePath, "utf-8");

  if (!generated.startsWith("// @ts-nocheck")) {
    writeFileSync(schemaFilePath, `// @ts-nocheck\n${generated}`);
  }

  // emit SDL
  writeFileSync(`${generatedDirectory}/schema.graphql`, printSchema(schema));

  // save hash
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(HASH_FILE, computeSchemaHash());

  console.info("[graphql:generate] Schema generated successfully");
};

await generateGraphqlSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
