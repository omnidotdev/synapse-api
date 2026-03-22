import { faker } from "@faker-js/faker";

import { encrypt } from "lib/crypto";
import { providerKeyTable } from "lib/db/schema";
import { createFactory } from "./base";

import type { InsertProviderKey, SelectProviderKey } from "lib/db/schema";

export const providerKeyFactory = createFactory<
  InsertProviderKey,
  SelectProviderKey
>(
  () => {
    const rawKey = `sk-test-${faker.string.alphanumeric(24)}`;

    return {
      userId: faker.string.uuid(),
      provider: faker.helpers.arrayElement(["openai", "anthropic", "google"]),
      encryptedKey: encrypt(rawKey),
      keyHint: rawKey.slice(-4),
    };
  },
  async (db, data) => {
    const [providerKey] = await db
      .insert(providerKeyTable)
      .values(data)
      .returning();
    return providerKey;
  },
);
