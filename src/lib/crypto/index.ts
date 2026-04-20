import { timingSafeEqual } from "node:crypto";

export { generateApiKey, hashApiKey } from "./apiKey";
export { decrypt, encrypt } from "./encrypt";

/**
 * Timing-safe string comparison to prevent timing attacks on secrets
 */
export const constantTimeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
};
