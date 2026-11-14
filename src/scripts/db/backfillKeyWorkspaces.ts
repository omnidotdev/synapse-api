/**
 * @file Move legacy direct API keys into their owner's personal workspace.
 *
 * Direct keys now belong to (and bill) a workspace, because Synapse checkout
 * subscribes a workspace. Keys created before that carry no workspace and
 * still bill their owner as a user, so a paying workspace's keys would resolve
 * as Free. This assigns each active legacy direct key to its owner's personal
 * workspace, the default home for a user's keys.
 *
 * Synapse does not store workspace membership, so the owner -> personal
 * workspace mapping comes from Gatekeeper as a JSON file
 * (`{ "<identityProviderId>": "<personalOrganizationId>" }`), produced with a
 * read-only query against the Gatekeeper database:
 *
 *   SELECT json_object_agg(m.user_id, o.id)
 *   FROM member m JOIN organization o ON o.id = m.organization_id
 *   WHERE o.type = 'personal' AND o.deleted_at IS NULL
 *     AND m.user_id IN (<owner identity provider ids>);
 *
 * Dry run by default; pass `--apply` to write. Idempotent: only keys that are
 * still unassigned are touched, so re-running is a no-op.
 *
 * Usage: bun src/scripts/db/backfillKeyWorkspaces.ts <mapping.json> [--apply]
 */

import { readFileSync } from "node:fs";

import { and, eq, isNull } from "drizzle-orm";

import { dbPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const [mappingPath, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");

if (!mappingPath) {
  console.error(
    "Usage: bun src/scripts/db/backfillKeyWorkspaces.ts <mapping.json> [--apply]",
  );
  process.exit(1);
}

const mapping = JSON.parse(readFileSync(mappingPath, "utf-8")) as Record<
  string,
  string
>;

for (const [owner, organizationId] of Object.entries(mapping)) {
  if (!UUID_RE.test(owner) || !UUID_RE.test(organizationId)) {
    console.error(`Invalid mapping entry: ${owner} -> ${organizationId}`);
    process.exit(1);
  }
}

// Active direct keys that do not yet belong to a workspace
const legacyKeys = await dbPool
  .select({
    id: apiKeyTable.id,
    name: apiKeyTable.name,
    identityProviderId: userTable.identityProviderId,
  })
  .from(apiKeyTable)
  .innerJoin(userTable, eq(userTable.id, apiKeyTable.userId))
  .where(
    and(
      isNull(apiKeyTable.appId),
      isNull(apiKeyTable.organizationId),
      isNull(apiKeyTable.revokedAt),
    ),
  );

let assigned = 0;
const unmapped: string[] = [];

for (const key of legacyKeys) {
  const organizationId = mapping[key.identityProviderId];

  if (!organizationId) {
    unmapped.push(key.id);
    continue;
  }

  console.info(
    `${apply ? "assign" : "would assign"} key ${key.id} (${key.name}) -> workspace ${organizationId}`,
  );

  if (apply) {
    await dbPool
      .update(apiKeyTable)
      .set({ organizationId, updatedAt: new Date().toISOString() })
      .where(
        and(eq(apiKeyTable.id, key.id), isNull(apiKeyTable.organizationId)),
      );
  }

  assigned += 1;
}

console.info(
  JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    legacyKeys: legacyKeys.length,
    assigned,
    unmapped,
  }),
);

process.exit(unmapped.length > 0 ? 2 : 0);
