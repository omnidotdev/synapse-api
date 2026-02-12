import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Read at call time so env can be set after module load (e.g. in tests)
const getKey = (): Buffer => {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error("ENCRYPTION_KEY is required for provider key encryption");
	}
	return Buffer.from(key, "base64");
};

/**
 * Encrypt a plaintext string
 * @returns base64(iv + ciphertext + tag)
 */
export const encrypt = (plaintext: string): string => {
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf-8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, encrypted, tag]).toString("base64");
};

/**
 * Decrypt a base64(iv + ciphertext + tag) string
 */
export const decrypt = (ciphertext: string): string => {
	const key = getKey();
	const buf = Buffer.from(ciphertext, "base64");

	const iv = buf.subarray(0, IV_LENGTH);
	const tag = buf.subarray(buf.length - TAG_LENGTH);
	const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]);

	return decrypted.toString("utf-8");
};
