import { Elysia, t } from "elysia";
import { createRemoteJWKSet, jwtVerify } from "jose";

import {
  AUTH_BASE_URL,
  BILLING_BASE_URL,
  BILLING_SERVICE_API_KEY,
} from "lib/config/env.config";
import { dbPool } from "lib/db";
import { userTable } from "lib/db/schema";

import type { SelectUser } from "lib/db/schema";

const JWKS = createRemoteJWKSet(
  new URL(`${AUTH_BASE_URL}/.well-known/jwks.json`),
);

/**
 * Resolve user from JWT Bearer token.
 * Returns the database user or null if unauthenticated
 */
const resolveUserFromBearer = async (
  authorization: string | null,
): Promise<SelectUser | null> => {
  const token = authorization?.split("Bearer ")[1];

  if (!token) return null;

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: AUTH_BASE_URL,
  });

  if (!payload.sub) return null;

  const [user] = await dbPool
    .insert(userTable)
    .values({ identityProviderId: payload.sub })
    .onConflictDoUpdate({
      target: userTable.identityProviderId,
      set: { updatedAt: new Date().toISOString() },
    })
    .returning();

  return user ?? null;
};

type AetherMeter = {
  id: string;
  appId: string;
  meterKey: string;
  value: number;
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
};

type AetherMetersResponse = {
  billingAccountId: string;
  meters: AetherMeter[];
};

const aetherHeaders = () => ({
  "x-service-api-key": BILLING_SERVICE_API_KEY!,
});

/**
 * User-facing usage and credit endpoints.
 * Authenticates via JWT and proxies to Aether with service API key
 */
const usageRoute = new Elysia()
  .get("/usage/me", async ({ headers, set }) => {
    if (!BILLING_BASE_URL || !BILLING_SERVICE_API_KEY) {
      set.status = 503;
      return { error: "billing not configured" };
    }

    const user = await resolveUserFromBearer(
      headers.authorization ?? null,
    ).catch(() => null);

    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const response = await fetch(
      `${BILLING_BASE_URL}/usage/synapse/user/${user.identityProviderId}`,
      { headers: aetherHeaders() },
    );

    if (!response.ok) {
      set.status = 502;
      return { error: "failed to fetch usage" };
    }

    const data: AetherMetersResponse = await response.json();

    return {
      userId: user.identityProviderId,
      meters: data.meters,
    };
  })
  .get("/credits/me/balance", async ({ headers, set }) => {
    if (!BILLING_BASE_URL || !BILLING_SERVICE_API_KEY) {
      set.status = 503;
      return { error: "billing not configured" };
    }

    const user = await resolveUserFromBearer(
      headers.authorization ?? null,
    ).catch(() => null);

    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const response = await fetch(
      `${BILLING_BASE_URL}/credits/synapse/user/${user.identityProviderId}/balance`,
      { headers: aetherHeaders() },
    );

    if (!response.ok) {
      set.status = 502;
      return { error: "failed to fetch balance" };
    }

    return response.json();
  })
  .post(
    "/credits/me/checkout",
    async ({ body, headers, set }) => {
      if (!BILLING_BASE_URL || !BILLING_SERVICE_API_KEY) {
        set.status = 503;
        return { error: "billing not configured" };
      }

      const user = await resolveUserFromBearer(
        headers.authorization ?? null,
      ).catch(() => null);

      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }

      // Validate redirect URLs to prevent open redirect attacks
      const allowedOrigins = [
        "https://synapse.omni.dev",
        "https://localhost:3000",
        "http://localhost:3000",
      ];
      const isAllowedUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return allowedOrigins.includes(parsed.origin);
        } catch {
          return false;
        }
      };

      if (!isAllowedUrl(body.successUrl) || !isAllowedUrl(body.cancelUrl)) {
        set.status = 400;
        return { error: "invalid redirect URL" };
      }

      const response = await fetch(`${BILLING_BASE_URL}/checkout/credits`, {
        method: "POST",
        headers: {
          ...aetherHeaders(),
          "Content-Type": "application/json",
          Authorization: `Bearer ${headers.authorization?.split("Bearer ")[1]}`,
        },
        body: JSON.stringify({
          appId: "synapse",
          amount: body.amount,
          successUrl: body.successUrl,
          cancelUrl: body.cancelUrl,
          entityType: "user",
          entityId: user.identityProviderId,
        }),
      });

      if (!response.ok) {
        set.status = 502;
        return { error: "failed to create checkout session" };
      }

      return response.json();
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 1 }),
        successUrl: t.String(),
        cancelUrl: t.String(),
      }),
    },
  );

export default usageRoute;
