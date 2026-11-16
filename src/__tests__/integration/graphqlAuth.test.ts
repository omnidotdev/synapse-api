import { afterEach, describe, expect, test } from "bun:test";

import { mswServer, TEST_TOKEN } from "test/setup/mswServer";
import { makeYogaServer } from "test/util/server";

afterEach(() => {
  mswServer.resetHandlers();
});

describe("GraphQL auth via useAuth", () => {
  test("throws error if user is not authenticated", async () => {
    const yoga = makeYogaServer();

    const query = /* GraphQL */ `
      {
        observer {
          id
        }
      }
    `;

    const res = await yoga.fetch("http://test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });

    expect(res.status).toBe(401);

    const json = await res.json();

    expect(json.errors).toBeDefined();
    expect(json.errors[0].message).toBe("Unauthorized field or type");
  });

  test("inserts or updates user on first authenticated request", async () => {
    const yoga = makeYogaServer({
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
    });

    const query = /* GraphQL */ `
      {
        observer {
          id
        }
      }
    `;

    const res = await yoga.fetch("http://test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();

    expect(json.errors).toBeUndefined();
  });

  test("generated table reads are not in the schema", async () => {
    const yoga = makeYogaServer({
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
    });

    // These were readable by any signed-in caller across all users before
    for (const field of [
      "users { totalCount }",
      "usageEvents { totalCount }",
      "userPreferences { totalCount }",
      'apiKeyByKeyHash(keyHash: "x") { id }',
      'node(id: "x") { id }',
    ]) {
      const res = await yoga.fetch("http://test/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: `{ ${field} }` }),
      });
      const json = await res.json();

      expect(json.data).toBeUndefined();
      expect(json.errors?.[0]?.message).toContain("Cannot query field");
    }
  });
});
