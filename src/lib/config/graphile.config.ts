import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { makePgService } from "postgraphile/adaptors/pg";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";

import {
  apiKeysPlugin,
  hideSecretColumnsPlugin,
  observerPlugin,
  preferencesPlugin,
  providerKeysPlugin,
  removeQueryNodePlugin,
  spendingLimitPlugin,
  usageAggregationPlugin,
  workspacesPlugin,
} from "lib/graphql/plugins";
import { DATABASE_URL, isDevEnv } from "./env.config";

/**
 * Graphile preset
 */
const graphilePreset: GraphileConfig.Preset = {
  extends: [
    PostGraphileAmberPreset,
    PgSimplifyInflectionPreset,
    PostGraphileConnectionFilterPreset,
  ],
  plugins: [
    hideSecretColumnsPlugin,
    observerPlugin,
    apiKeysPlugin,
    preferencesPlugin,
    providerKeysPlugin,
    removeQueryNodePlugin,
    spendingLimitPlugin,
    usageAggregationPlugin,
    workspacesPlugin,
  ],
  // NodeAccessorPlugin adds a `<type>ById(id: ID!)` root read per table that
  // bypasses the custom, authorized fields
  disablePlugins: ["NodeAccessorPlugin"],
  pgServices: [makePgService({ connectionString: DATABASE_URL })],
  grafast: { explain: isDevEnv },
  schema: {
    // Disable all auto-generated CRUD operations on tables. All queries and
    // mutations are defined explicitly via custom plugins with proper authZ.
    // The root-read behaviors are `query:resource:*` in Postgraphile v5; the
    // previous `select:*` spellings matched nothing, so every table's
    // connection and unique lookups (usage events, preferences, users, the
    // API key by hash) stayed readable by any signed-in caller, unscoped
    defaultBehavior:
      "-insert -update -delete -query:resource:connection -query:resource:list -query:resource:single",
  },
};

export default graphilePreset;
