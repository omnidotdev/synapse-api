import { describe, expect, it } from "bun:test";

import { authzProviderConfig, billingProviderConfig } from "./config";

describe("billingProviderConfig", () => {
  it("authenticates to Aether with the service key", () => {
    expect(billingProviderConfig("https://billing", "svc")).toEqual({
      provider: "aether",
      baseUrl: "https://billing",
      appId: "synapse",
      serviceApiKey: "svc",
    });
  });

  it("falls back to the noop provider without a base URL", () => {
    expect(billingProviderConfig(undefined, "svc")).toEqual({});
  });
});

describe("authzProviderConfig", () => {
  it("authenticates to Warden with the service key", () => {
    expect(authzProviderConfig("https://access", "svc")).toEqual({
      apiUrl: "https://access",
      serviceKey: "svc",
      source: "synapse",
    });
  });

  it("is null without an API URL", () => {
    expect(authzProviderConfig(undefined, "svc")).toBeNull();
  });
});
