import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "synapse_";
const KEY_BYTES = 16;

/**
 * Generate a new API key
 * @returns raw key, SHA-256 hash, and last 4 char hint
 */
export const generateApiKey = (): {
  raw: string;
  hash: string;
  hint: string;
} => {
  const bytes = randomBytes(KEY_BYTES);
  const raw = `${API_KEY_PREFIX}${bytes.toString("hex")}`;
  const hash = hashApiKey(raw);
  const hint = raw.slice(-4);

  return { raw, hash, hint };
};

/**
 * SHA-256 hash of a raw API key
 */
export const hashApiKey = (raw: string): string => {
  return createHash("sha256").update(raw).digest("hex");
};
