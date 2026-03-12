import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { decrypt, encrypt } from "lib/crypto";

describe("crypto", () => {
	test("round-trips a string", () => {
		const input = "sk-ant-api03-test-key-1234";
		const encrypted = encrypt(input);
		expect(encrypted).not.toBe(input);
		expect(decrypt(encrypted)).toBe(input);
	});

	test("produces different ciphertext for same input", () => {
		const input = "same-key";
		expect(encrypt(input)).not.toBe(encrypt(input));
	});
});
