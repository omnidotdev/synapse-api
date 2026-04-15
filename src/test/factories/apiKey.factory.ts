import { faker } from "@faker-js/faker";

import { generateApiKey } from "lib/crypto";
import { apiKeyTable } from "lib/db/schema";
import { createFactory } from "./base";

import type { InsertApiKey, SelectApiKey } from "lib/db/schema";

export const apiKeyFactory = createFactory<InsertApiKey, SelectApiKey>(
  () => {
    const { hash, hint } = generateApiKey();

    return {
      userId: faker.string.uuid(),
      keyHash: hash,
      keyHint: hint,
      name: faker.word.words(2),
      mode: "byok",
    };
  },
  async (db, data) => {
    const [apiKey] = await db.insert(apiKeyTable).values(data).returning();
    return apiKey;
  },
);
