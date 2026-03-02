import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { makePgService } from "postgraphile/adaptors/pg";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";

import {
  apiKeysPlugin,
  observerPlugin,
  preferencesPlugin,
  providerKeysPlugin,
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
    observerPlugin,
    apiKeysPlugin,
    preferencesPlugin,
    providerKeysPlugin,
    usageAggregationPlugin,
    workspacesPlugin,
  ],
  pgServices: [makePgService({ connectionString: DATABASE_URL })],
  grafast: { explain: isDevEnv },
};

export default graphilePreset;
