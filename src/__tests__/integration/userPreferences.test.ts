import { describe, expect, test } from "bun:test";

import { userFactory } from "test/factories";
import { setupTestContext } from "test/setup/testContext";

const ctx = setupTestContext();

const UPDATE_PREFERENCES = /* GraphQL */ `
  mutation UpdatePreferences($input: UpdateUserPreferencesInput!) {
    updateUserPreferences(input: $input) {
      defaultProvider
    }
  }
`;

describe("updateUserPreferences", () => {
  test("accepts a provider the gateway routes to", async () => {
    const user = await userFactory.create(ctx.db);

    const res = await ctx
      .graphqlAs(user)
      .execute<{ updateUserPreferences: { defaultProvider: string } }>(
        UPDATE_PREFERENCES,
        { input: { defaultProvider: "anthropic" } },
      );

    expect(res.errors).toBeUndefined();
    expect(res.data?.updateUserPreferences.defaultProvider).toBe("anthropic");
  });

  // The NVIDIA hosted API allows trial use only, so the gateway does not route to it
  test("rejects nvidia as a default provider", async () => {
    const user = await userFactory.create(ctx.db);

    const res = await ctx
      .graphqlAs(user)
      .execute(UPDATE_PREFERENCES, { input: { defaultProvider: "nvidia" } });

    expect(res.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });
});
