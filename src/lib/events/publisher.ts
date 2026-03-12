/**
 * Singleton Iggy event publisher.
 *
 * Mirrors vortex-worker's publisher pattern as a module singleton.
 * Allows routes and plugins to emit events back to the streaming layer.
 */

import { randomUUID } from "node:crypto";

import { Client, Partitioning } from "@iggy.rs/sdk";
import { CompressionAlgorithmKind } from "@iggy.rs/sdk/dist/wire/topic/topic.utils.js";

import type { EventInput, EventsConfig, OmniEvent } from "./types";

const STREAM_NAME = "omni-events";
const STREAM_ID = 1;
const DEFAULT_PARTITIONS = 3;
// 90-day retention
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

let client: Client | null = null;
const knownTopics = new Set<string>();

/**
 * Connect to Iggy and ensure the base stream exists.
 */
export async function initPublisher(config: EventsConfig): Promise<void> {
  client = new Client({
    transport: "TCP",
    options: { host: config.host, port: config.port },
    credentials: {
      username: config.username,
      password: config.password,
    },
  });

  await ensureStream();

  // biome-ignore lint/suspicious/noConsole: startup logging
  console.log("[Events] Publisher initialized", {
    host: config.host,
    port: config.port,
  });
}

/**
 * Publish an event to the organization's topic.
 *
 * Generates `id` and `timestamp` automatically, ensures the org topic
 * exists, and partitions by `subject` when provided.
 * @returns Published event, or `null` if publisher is not initialized
 */
export async function publish(input: EventInput): Promise<OmniEvent | null> {
  if (!client) return null;

  const event: OmniEvent = {
    ...input,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const topicName = input.organizationId;
  await ensureTopic(topicName);

  const partition = event.subject
    ? Partitioning.MessageKey(event.subject)
    : Partitioning.Balanced;

  await client.message.send({
    streamId: STREAM_ID,
    topicId: topicName,
    messages: [{ payload: Buffer.from(JSON.stringify(event)) }],
    partition,
  });

  return event;
}

/**
 * Close the Iggy connection and reset state.
 */
export function closePublisher(): void {
  client?.destroy();
  client = null;
  knownTopics.clear();

  // biome-ignore lint/suspicious/noConsole: shutdown logging
  console.log("[Events] Publisher closed");
}

// -- Private helpers --

/**
 * Idempotently ensure the omni-events stream exists.
 */
async function ensureStream(): Promise<void> {
  if (!client) return;

  try {
    await client.stream.get({ streamId: STREAM_ID });
  } catch {
    await client.stream.create({ streamId: STREAM_ID, name: STREAM_NAME });
  }
}

/**
 * Idempotently ensure a topic exists within the omni-events stream.
 */
async function ensureTopic(name: string): Promise<void> {
  if (knownTopics.has(name)) return;
  if (!client) return;

  try {
    await client.topic.get({ streamId: STREAM_ID, topicId: name });
  } catch {
    await client.topic.create({
      streamId: STREAM_ID,
      topicId: 0,
      name,
      partitionCount: DEFAULT_PARTITIONS,
      compressionAlgorithm: CompressionAlgorithmKind.None,
      messageExpiry: BigInt(RETENTION_SECONDS),
    });
  }

  knownTopics.add(name);
}
