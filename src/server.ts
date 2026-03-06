import { cors } from "@elysiajs/cors";
import { yoga } from "@elysiajs/graphql-yoga";
import { useOpenTelemetry } from "@envelop/opentelemetry";
import { useParserCache } from "@envelop/parser-cache";
import { useValidationCache } from "@envelop/validation-cache";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { registerSchemas } from "@omnidotdev/providers";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { useGrafast } from "grafast/envelop";
import { makeSchema } from "postgraphile";
import webhooks from "webhooks";

import appConfig from "lib/config/app.config";
import graphilePreset from "lib/config/graphile.config";
import {
  CORS_ALLOWED_ORIGINS,
  IGGY_HOST,
  IGGY_PASSWORD,
  IGGY_PORT,
  IGGY_USERNAME,
  PORT,
  VORTEX_API_KEY,
  VORTEX_API_URL,
  isDevEnv,
  isProdEnv,
} from "lib/config/env.config";
import { dbPool, pgPool } from "lib/db";
import ensureDatabase from "lib/db/ensureDatabase";
import { closePublisher, initPublisher } from "lib/events/publisher";
import createGraphqlContext from "lib/graphql/createGraphqlContext";
import { armorPlugin, createAuthenticationPlugin } from "lib/graphql/plugins";
import {
  provisionKeyRoute,
  reportUsageRoute,
  resolveKeyRoute,
  resolveProviderKeysRoute,
  usageRoute,
} from "lib/routes";

// ensure database exists before starting
await ensureDatabase();

// Build GraphQL schema from Postgraphile preset (includes custom plugins)
const { schema } = await makeSchema(graphilePreset);

// Initialize event publisher only when explicitly configured
// Skipping when IGGY_HOST is unset avoids a crash from the SDK's connection pool
// eagerly creating TCP sockets that emit unhandled 'error' events on failure
if (process.env.IGGY_HOST) {
  try {
    await initPublisher({
      host: IGGY_HOST,
      port: Number(IGGY_PORT),
      username: IGGY_USERNAME,
      password: IGGY_PASSWORD,
    });
  } catch (err) {
    console.warn(
      "[Events] Publisher init failed, events will be skipped:",
      err,
    );
  }
} else {
  console.warn("[Events] IGGY_HOST not configured, event publishing disabled");
}

// Register event schemas with Vortex
if (VORTEX_API_URL && VORTEX_API_KEY) {
  registerSchemas(VORTEX_API_URL, VORTEX_API_KEY, [
    {
      name: "synapse.provider.error",
      source: "omni.synapse",
      description: "AI provider returned an error",
    },
    {
      name: "synapse.provider.health_changed",
      source: "omni.synapse",
      description: "AI provider health status changed",
    },
    {
      name: "synapse.usage.threshold",
      source: "omni.synapse",
      description: "Usage threshold reached for an AI provider key",
    },
    {
      name: "synapse.workspace.created",
      source: "omni.synapse",
      description: "Workspace created",
    },
    {
      name: "synapse.workspace.updated",
      source: "omni.synapse",
      description: "Workspace updated",
    },
    {
      name: "synapse.workspace.deleted",
      source: "omni.synapse",
      description: "Workspace deleted",
    },
    {
      name: "synapse.preferences.updated",
      source: "omni.synapse",
      description: "User preferences updated",
    },
  ]).catch((err) => {
    console.warn("[Events] Schema registration failed:", err);
  });
}

/**
 * Elysia server.
 */
const app = new Elysia({
  ...(isDevEnv && {
    serve: {
      // https://elysiajs.com/patterns/configuration#serve-tls
      // https://bun.sh/guides/http/tls
      // NB: Elysia (and Bun) trust the well-known CA list curated by Mozilla (https://wiki.mozilla.org/CA/Included_Certificates), but they can be customized here if needed (`tls.ca` option)
      tls: {
        certFile: "cert.pem",
        keyFile: "key.pem",
      },
    },
  }),
})
  // security headers
  .onAfterHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  })
  .use(
    cors({
      origin: CORS_ALLOWED_ORIGINS!.split(","),
      methods: ["GET", "POST"],
    }),
  )
  // rate limiting
  .use(
    rateLimit({
      max: 100,
      duration: 60_000,
    }),
  )
  // health check endpoint
  .get("/health", () => ({
    status: "ok",
    timestamp: Date.now(),
    service: appConfig.name,
  }))
  // readiness endpoint
  .get("/ready", async ({ set }) => {
    try {
      await dbPool.execute(sql`SELECT 1`);

      return {
        status: "ready",
        database: "connected",
        timestamp: Date.now(),
      };
    } catch {
      set.status = 503;

      return {
        status: "not ready",
        database: "disconnected",
        timestamp: Date.now(),
      };
    }
  })
  // internal gateway routes
  .use(resolveKeyRoute)
  .use(resolveProviderKeysRoute)
  .use(provisionKeyRoute)
  .use(reportUsageRoute)
  .use(usageRoute)
  .use(webhooks)
  .use(
    yoga({
      schema,
      context: createGraphqlContext,
      graphiql: isDevEnv,
      plugins: [
        ...armorPlugin,
        createAuthenticationPlugin(),
        // disable GraphQL schema introspection in production to mitigate reverse engineering
        isProdEnv && useDisableIntrospection(),
        useOpenTelemetry({
          variables: true,
          result: true,
        }),
        // parser and validation caches recommended for Grafast (https://grafast.org/grafast/servers#envelop)
        useParserCache(),
        useValidationCache(),
        useGrafast(),
      ],
    }),
  )
  .listen(PORT);

// biome-ignore lint/suspicious/noConsole: root logging
console.log(
  `🦊 ${appConfig.name} Elysia server running at ${app.server?.url.toString().slice(0, -1)}`,
);

// biome-ignore lint/suspicious/noConsole: root logging
console.log(
  `🧘 ${appConfig.name} GraphQL Yoga API running at ${app.server?.url}graphql`,
);

/**
 * Graceful shutdown handler.
 */
const shutdown = async (signal: string) => {
  // biome-ignore lint/suspicious/noConsole: shutdown logging
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  app.stop();

  // Close database pool
  await pgPool.end();

  // Close event publisher
  closePublisher();

  // biome-ignore lint/suspicious/noConsole: shutdown logging
  console.log("[Server] Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
