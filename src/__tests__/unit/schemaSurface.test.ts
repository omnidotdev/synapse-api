import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  assertSchemaSurface,
  findGeneratedCrudMutations,
  findTableReadFields,
  loadSchema,
} from "@omnidotdev/providers/graphql-surface";

import type { SchemaSurfacePolicy } from "@omnidotdev/providers/graphql-surface";

/**
 * Reviewed GraphQL surface.
 *
 * Every root field is a custom plugin field that authorizes the caller. The
 * preset turns off generated mutations and generated root reads
 * (`query:resource:*`), the `*ById` node accessors, and the root `node(id)`
 * lookup. Before, the read behaviors were misspelled and every table's
 * connection and unique lookups (usage events, preferences, users, API keys
 * by hash) were readable by any signed-in caller
 */
const POLICY: SchemaSurfacePolicy = {
  Query: {
    id: "Relay node id of the root query (no data)",
    observer: "the caller's own identity",
    usageBreakdown:
      "the caller's own usage, or a workspace the caller is a member of",
    orgWorkspaces: "member of the requested organization",
  },
  Mutation: {
    generateApiKey: "member with permission on the key's organization",
    revokeApiKey: "the key's owner, or an admin of its organization",
    linkProviderKey: "the caller's own API key and provider key",
    unlinkProviderKey: "the caller's own API key",
    updateUserPreferences: "the caller's own preferences",
    setProviderKey: "the caller's own provider keys (or an org they manage)",
    removeProviderKey: "the caller's own provider keys",
    setSpendingLimit: "permission on the target organization (Warden)",
    addWorkspace: "member of the organization",
    patchWorkspace: "permission on the workspace's organization",
    removeWorkspace: "permission on the workspace's organization",
  },
};

const schema = loadSchema(
  join(import.meta.dir, "../../generated/graphql/schema.graphql"),
);

describe("GraphQL schema surface", () => {
  test("matches the reviewed policy", () => {
    assertSchemaSurface(schema, POLICY);
  });

  test("exposes no generated CRUD or table reads", () => {
    expect(findGeneratedCrudMutations(schema)).toEqual([]);
    expect(findTableReadFields(schema)).toEqual([]);
  });
});
