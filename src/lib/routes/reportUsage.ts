import { createHash } from "node:crypto";

import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { GATEWAY_SECRET } from "lib/config/env.config";
import { PLAN_RATE_LIMITS } from "lib/config/plans.config";
import { constantTimeEqual } from "lib/crypto";
import { dbPool } from "lib/db";
import { apiKeyTable, usageEventTable, userTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { events } from "lib/providers";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a reported id can be looked up in a uuid column at all */
const isUuid = (value: string) => UUID_PATTERN.test(value);

/** Clock skew tolerated on a reported served time */
const MAX_FUTURE_SKEW_MS = 60_000;

/**
 * When an event happened: the gateway's served time, so a batch flushed just
 * after midnight stays on the UTC day it was served (and charged). A missing,
 * unparseable, or future time falls back to when the batch arrived
 */
const servedAt = (occurredAt: string | undefined, receivedAt: Date): Date => {
  if (!occurredAt) return receivedAt;
  const served = new Date(occurredAt);
  if (
    Number.isNaN(served.getTime()) ||
    served.getTime() > receivedAt.getTime() + MAX_FUTURE_SKEW_MS
  ) {
    return receivedAt;
  }
  return served;
};

/**
 * Internal endpoint for gateway usage reporting
 */
const reportUsageRoute = new Elysia().post(
  "/internal/report-usage",
  async ({ body, headers, set }) => {
    const secret = headers["x-gateway-secret"];

    if (
      !GATEWAY_SECRET ||
      !secret ||
      !constantTimeEqual(secret, GATEWAY_SECRET)
    ) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    if (body.events.length === 0) {
      return { recorded: 0, skipped: 0 };
    }

    // The gateway sends identityProviderId as userId (needed for Aether billing).
    // Map each event's OWN identity to the internal DB user ID for the FK
    // constraint on usage_event. The gateway's flush batches events across
    // concurrent users, so every event must be attributed to its own user
    // rather than reusing the first event's identity (which would bill one
    // user for everyone else's tokens). An internal user id is accepted too
    const reportedUserIds = [
      ...new Set(body.events.map((e) => e.userId).filter(isUuid)),
    ];
    const reportedKeyIds = [
      ...new Set(body.events.map((e) => e.apiKeyId).filter(isUuid)),
    ];

    const [users, keys] = await Promise.all([
      reportedUserIds.length
        ? dbPool
            .select({
              id: userTable.id,
              identityProviderId: userTable.identityProviderId,
            })
            .from(userTable)
            .where(
              or(
                inArray(userTable.identityProviderId, reportedUserIds),
                inArray(userTable.id, reportedUserIds),
              ),
            )
        : [],
      reportedKeyIds.length
        ? dbPool
            .select({ id: apiKeyTable.id })
            .from(apiKeyTable)
            .where(inArray(apiKeyTable.id, reportedKeyIds))
        : [],
    ]);

    const internalIdByReported = new Map<string, string>();
    for (const u of users) {
      internalIdByReported.set(u.id, u.id);
      internalIdByReported.set(u.identityProviderId, u.id);
    }
    const knownKeyIds = new Set(keys.map((k) => k.id));

    // Idempotency: the gateway reports at-least-once, so a lost HTTP response
    // triggers a retry that re-sends the identical batch. Derive a stable
    // dedup key per event so the retry is a no-op. Prefer a client supplied
    // `eventId` when present (per-event, survives batch recomposition);
    // otherwise fall back to a key derived from the batch content plus the
    // event's position. ASSUMPTION: a retry re-sends the byte-identical batch,
    // so the batch hash and index reproduce the same keys. LIMITATION: this
    // fallback does not dedup a retry that recomposes the batch (adds/removes
    // events); the gateway should send `eventId` to cover that case.
    const batchHash = createHash("sha256")
      .update(JSON.stringify(body.events))
      .digest("hex");
    const dedupeKeyFor = (e: (typeof body.events)[number], index: number) =>
      e.eventId ?? `${batchHash}:${index}`;

    // An event whose user or key is unknown cannot be stored (foreign keys).
    // Skip it rather than fail the batch: a failed batch is retried whole by
    // the gateway, so one such event would block every other event with it
    let skipped = 0;
    const attributable = body.events.flatMap((e, index) => {
      const internalUserId = internalIdByReported.get(e.userId);
      if (!internalUserId || !knownKeyIds.has(e.apiKeyId)) {
        skipped += 1;
        return [];
      }
      return [{ source: e, index, internalUserId }];
    });
    if (skipped > 0) {
      console.warn(
        `[report-usage] skipped ${skipped} of ${body.events.length} usage events with an unknown user or API key`,
      );
    }

    // Prepare rows, dropping in-batch duplicate dedup keys (e.g. a client that
    // repeats an eventId) so a single INSERT ... ON CONFLICT DO NOTHING never
    // conflicts with itself.
    const receivedAt = new Date();
    const seenKeys = new Set<string>();
    const prepared = attributable
      .map(({ source: e, index, internalUserId }) => ({
        source: e,
        idpUserId: e.userId,
        // A workspace id that is not a uuid cannot be stored; keep the event
        workspaceId:
          e.workspaceId && isUuid(e.workspaceId) ? e.workspaceId : undefined,
        internalUserId,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        dedupeKey: dedupeKeyFor(e, index),
        createdAt: servedAt(e.occurredAt, receivedAt),
      }))
      .filter((p) => {
        if (seenKeys.has(p.dedupeKey)) return false;
        seenKeys.add(p.dedupeKey);
        return true;
      });

    if (prepared.length === 0) {
      return { recorded: 0, skipped };
    }

    const insertRows = prepared.map((p) => ({
      userId: p.internalUserId,
      workspaceId: p.workspaceId,
      apiKeyId: p.source.apiKeyId,
      provider: p.source.provider,
      model: p.source.model,
      inputTokens: p.inputTokens,
      outputTokens: p.outputTokens,
      costCents: p.source.costCents,
      mode: p.source.mode,
      modality: p.source.modality,
      dedupeKey: p.dedupeKey,
      createdAt: p.createdAt.toISOString(),
    }));

    const inserted = await dbPool
      .insert(usageEventTable)
      .values(insertRows)
      .onConflictDoNothing({ target: usageEventTable.dedupeKey })
      .returning({ dedupeKey: usageEventTable.dedupeKey });

    // Only newly inserted events should drive billing side effects; a
    // deduped retry inserts nothing and must not re-emit.
    const insertedKeys = new Set(inserted.map((r) => r.dedupeKey));
    const newEvents = prepared.filter((p) => insertedKeys.has(p.dedupeKey));

    // Group newly inserted events by their OWN identity so each user's usage
    // is emitted under their own subject/organization.
    type Group = {
      idpUserId: string;
      workspaceId?: string;
      internalUserId: string;
      count: number;
      tokens: number;
    };
    const groups = new Map<string, Group>();
    for (const p of newEvents) {
      const key = `${p.idpUserId}:${p.workspaceId ?? ""}`;
      const group = groups.get(key) ?? {
        idpUserId: p.idpUserId,
        workspaceId: p.workspaceId,
        internalUserId: p.internalUserId,
        count: 0,
        tokens: 0,
      };
      group.count += 1;
      group.tokens += p.inputTokens + p.outputTokens;
      groups.set(key, group);
    }

    // Publish usage events per identity (best-effort, fire-and-forget)
    for (const group of groups.values()) {
      const organizationId = group.workspaceId ?? group.idpUserId;
      const data = {
        count: group.count,
        userId: group.idpUserId,
        workspaceId: group.workspaceId,
      };

      publish({
        type: "synapse.usage.recorded",
        source: "omni.synapse",
        organizationId,
        subject: group.idpUserId,
        data,
      }).catch(() => {});
      void events.emit({
        type: "synapse.usage.recorded",
        data,
        organizationId,
        subject: group.idpUserId,
      });
    }

    // Check daily token usage against plan rate limits, per user
    // (best-effort, fire-and-forget)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Aggregate this batch's newly inserted tokens per internal user
    const batchTokensByUser = new Map<string, number>();
    for (const group of groups.values()) {
      batchTokensByUser.set(
        group.internalUserId,
        (batchTokensByUser.get(group.internalUserId) ?? 0) + group.tokens,
      );
    }
    // Keep one representative identity per internal user for the emitted event
    const identityByUser = new Map<
      string,
      { idpUserId: string; workspaceId?: string }
    >();
    for (const group of groups.values()) {
      if (!identityByUser.has(group.internalUserId)) {
        identityByUser.set(group.internalUserId, {
          idpUserId: group.idpUserId,
          workspaceId: group.workspaceId,
        });
      }
    }

    for (const [internalUserId, identity] of identityByUser) {
      const batchTokens = batchTokensByUser.get(internalUserId) ?? 0;
      const organizationId = identity.workspaceId ?? identity.idpUserId;

      // noinspection ES6MissingAwait (fire-and-forget)
      void Promise.all([
        dbPool
          .select({ plan: userTable.plan })
          .from(userTable)
          .where(eq(userTable.id, internalUserId))
          .limit(1),
        dbPool
          .select({
            totalTokens: sql<number>`coalesce(sum(${usageEventTable.inputTokens} + ${usageEventTable.outputTokens}), 0)::int`,
          })
          .from(usageEventTable)
          .where(
            and(
              eq(usageEventTable.userId, internalUserId),
              gte(usageEventTable.createdAt, startOfDay.toISOString()),
            ),
          ),
      ])
        .then(([[user], [usage]]) => {
          const plan = (user?.plan ?? "free") as keyof typeof PLAN_RATE_LIMITS;
          const limits = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;
          const dailyTokens = usage?.totalTokens ?? 0;

          // Only fire when crossing from below to at/above threshold (not on every batch)
          // Skip threshold check for BYOK-only plans (managedTokenBudget === 0)
          const tokensBeforeThisReport = Math.max(0, dailyTokens - batchTokens);
          const budget = limits.managedTokenBudget;
          const hasLimit = budget > 0;
          const wasAlreadyAbove =
            hasLimit && tokensBeforeThisReport >= budget * 0.8;
          const isNowAbove = hasLimit && dailyTokens >= budget * 0.8;

          if (isNowAbove && !wasAlreadyAbove) {
            const data = {
              thresholdType: "managed_token_budget",
              current: dailyTokens,
              limit: budget,
              userId: identity.idpUserId,
              workspaceId: identity.workspaceId,
            };
            publish({
              type: "synapse.usage.threshold",
              source: "omni.synapse",
              organizationId,
              subject: identity?.idpUserId,
              data,
            }).catch(() => {});
            void events.emit({
              type: "synapse.usage.threshold",
              data,
              organizationId,
              subject: identity?.idpUserId,
            });
          }
        })
        .catch(() => {});
    }

    return { recorded: attributable.length, skipped };
  },
  {
    body: t.Object({
      events: t.Array(
        t.Object({
          // Optional client-supplied idempotency key. When the gateway sends
          // it, retries dedup per-event; otherwise a batch-derived key is used
          eventId: t.Optional(t.String()),
          userId: t.String(),
          // The gateway serializes an absent workspace as null
          workspaceId: t.Optional(t.Nullable(t.String())),
          apiKeyId: t.String(),
          provider: t.String(),
          model: t.String(),
          inputTokens: t.Number({ minimum: 0 }),
          outputTokens: t.Number({ minimum: 0 }),
          // Retail cost in cents, fractional to Aether's $0.0001 precision
          costCents: t.Number({ minimum: 0 }),
          mode: t.String(),
          // Aether reference type of the charge; absent means a completion
          modality: t.Optional(t.String({ pattern: "^[a-z][a-z_]{0,31}$" })),
          // When the gateway served the request (ISO 8601)
          occurredAt: t.Optional(t.String()),
        }),
      ),
    }),
  },
);

export default reportUsageRoute;
