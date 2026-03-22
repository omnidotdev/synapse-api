/**
 * One-time migration: move Synapse provider keys to Gatekeeper vault.
 *
 * Reads all rows from `provider_key`, decrypts each with Synapse's
 * ENCRYPTION_KEY, then stores the plaintext via Gatekeeper's S2S vault API.
 *
 * Required env vars:
 *   ENCRYPTION_KEY          - Synapse AES-256-GCM key (base64)
 *   GATEKEEPER_URL          - Gatekeeper base URL (e.g. http://localhost:4000)
 *   GATEKEEPER_SERVICE_KEY  - S2S bearer token for Gatekeeper
 *   DATABASE_URL            - Synapse database connection string
 *
 * Usage:
 *   bun run scripts/migrate-provider-keys-to-vault.ts
 *   bun run scripts/migrate-provider-keys-to-vault.ts --dry-run
 */

import { eq } from "drizzle-orm";

import { decrypt } from "lib/crypto";
import { dbPool, pgPool } from "lib/db";
import { providerKeyTable, userTable } from "lib/db/schema";

// ---------- env validation ----------

const GATEKEEPER_URL = process.env.GATEKEEPER_URL;
const GATEKEEPER_SERVICE_KEY = process.env.GATEKEEPER_SERVICE_KEY;

if (!GATEKEEPER_URL) {
  console.error("Missing required env var: GATEKEEPER_URL");
  process.exit(1);
}

if (!GATEKEEPER_SERVICE_KEY) {
  console.error("Missing required env var: GATEKEEPER_SERVICE_KEY");
  process.exit(1);
}

// ENCRYPTION_KEY is validated inside decrypt() at call time

// ---------- flags ----------

const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  // biome-ignore lint/suspicious/noConsole: script output
  console.log("[dry-run] No keys will be written to Gatekeeper\n");
}

// ---------- fetch all provider keys ----------

const rows = await dbPool
  .select({
    id: providerKeyTable.id,
    userId: providerKeyTable.userId,
    provider: providerKeyTable.provider,
    encryptedKey: providerKeyTable.encryptedKey,
    keyHint: providerKeyTable.keyHint,
    modelPreference: providerKeyTable.modelPreference,
  })
  .from(providerKeyTable);

// biome-ignore lint/suspicious/noConsole: script output
console.log(`Found ${rows.length} provider key(s) to migrate\n`);

// ---------- migrate ----------

let migrated = 0;
let failed = 0;

for (const row of rows) {
  const label = `[${row.provider}] user=${row.userId} hint=...${row.keyHint}`;

  try {
    // Look up the user's Gatekeeper identity
    const [user] = await dbPool
      .select({ identityProviderId: userTable.identityProviderId })
      .from(userTable)
      .where(eq(userTable.id, row.userId))
      .limit(1);

    if (!user) {
      console.error(`SKIP ${label} - user not found in Synapse`);
      failed++;
      continue;
    }

    const gatekeeperUserId = user.identityProviderId;

    // Decrypt with Synapse's key
    const plaintext = decrypt(row.encryptedKey);

    if (dryRun) {
      // biome-ignore lint/suspicious/noConsole: script output
      console.log(
        `[dry-run] Would migrate ${label} -> Gatekeeper user=${gatekeeperUserId}`,
      );
      migrated++;
      continue;
    }

    // POST to Gatekeeper vault
    const url = `${GATEKEEPER_URL}/api/vault/keys/${encodeURIComponent(gatekeeperUserId)}/${encodeURIComponent(row.provider)}`;

    const body: Record<string, string> = { api_key: plaintext };
    if (row.modelPreference) {
      body.model = row.modelPreference;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEKEEPER_SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gatekeeper responded ${res.status}: ${text}`);
    }

    // biome-ignore lint/suspicious/noConsole: script output
    console.log(`OK   ${label} -> Gatekeeper user=${gatekeeperUserId}`);
    migrated++;
  } catch (err) {
    console.error(`FAIL ${label} -`, err instanceof Error ? err.message : err);
    failed++;
  }
}

// ---------- summary ----------

// biome-ignore lint/suspicious/noConsole: script output
console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed`);

await pgPool.end();
process.exit(failed > 0 ? 1 : 0);
