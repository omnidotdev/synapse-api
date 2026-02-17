import { describe, expect, test } from "bun:test";

import { generateApiKey, hashApiKey } from "lib/crypto";

describe("API key generation", () => {
	test("generates key with correct prefix", () => {
		const { raw } = generateApiKey();
		expect(raw.startsWith("synapse_")).toBe(true);
	});

	test("generates unique keys", () => {
		const a = generateApiKey();
		const b = generateApiKey();
		expect(a.raw).not.toBe(b.raw);
		expect(a.hash).not.toBe(b.hash);
	});

	test("hash is deterministic", () => {
		const { raw, hash } = generateApiKey();
		expect(hashApiKey(raw)).toBe(hash);
	});

	test("hint is last 4 chars", () => {
		const { raw, hint } = generateApiKey();
		expect(hint).toBe(raw.slice(-4));
	});
});
