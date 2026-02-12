import { sql } from "drizzle-orm";

import type { TestDatabase } from "./createTestDatabase";

/**
 * Reset database between tests by truncating all tables.
 * Uses CASCADE to handle foreign key constraints.
 */
export const resetDatabase = async (db: TestDatabase["db"]): Promise<void> => {
  await db.execute(
    sql`TRUNCATE TABLE "usage_event", "provider_key", "api_key", "user" CASCADE`,
  );
};
