/**
 * Seed a test user and API key for local development.
 *
 * Usage: bun run scripts/seed-test-key.ts
 */

import { dbPool, pgPool } from "lib/db";
import { apiKeyTable, userTable } from "lib/db/schema";
import { generateApiKey } from "lib/crypto";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "a0000000-0000-0000-0000-000000000001";

// Upsert test user
const [user] = await dbPool
  .select()
  .from(userTable)
  .where(eq(userTable.id, TEST_USER_ID))
  .limit(1);

if (!user) {
  await dbPool.insert(userTable).values({
    id: TEST_USER_ID,
    identityProviderId: TEST_USER_ID,
    email: "test@example.com",
    name: "Test User",
  });
  console.log("Created test user:", TEST_USER_ID);
} else {
  console.log("Test user already exists:", TEST_USER_ID);
}

// Generate and insert API key
const { raw, hash, hint } = generateApiKey();

await dbPool.insert(apiKeyTable).values({
  userId: TEST_USER_ID,
  keyHash: hash,
  keyHint: hint,
  name: "test-key",
  mode: "managed",
});

console.log("\nTest API key created:");
console.log(`  Raw key: ${raw}`);
console.log(`  Hint:    ...${hint}`);
console.log(`  Mode:    managed`);
console.log("\nUse with gateway:");
console.log(`  curl -H "Authorization: Bearer ${raw}" ...`);

await pgPool.end();
process.exit(0);
