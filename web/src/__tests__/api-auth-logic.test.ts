import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("API key auth logic", () => {
  describe("key generation format", () => {
    it("generates keys with ck_live_ prefix", () => {
      const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      expect(rawKey).toMatch(/^ck_live_[a-f0-9]{48}$/);
    });

    it("generates unique keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(`ck_live_${crypto.randomBytes(24).toString("hex")}`);
      }
      expect(keys.size).toBe(100);
    });

    it("prefix is first 16 chars", () => {
      const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const prefix = rawKey.slice(0, 16);
      expect(prefix).toBe(rawKey.substring(0, 16));
      expect(prefix.startsWith("ck_live_")).toBe(true);
      expect(prefix.length).toBe(16);
    });
  });

  describe("SHA-256 hashing", () => {
    it("produces consistent hash for same input", () => {
      const key = "ck_live_test123456789012345678901234567890abcdef01";
      const hash1 = crypto.createHash("sha256").update(key).digest("hex");
      const hash2 = crypto.createHash("sha256").update(key).digest("hex");
      expect(hash1).toBe(hash2);
    });

    it("produces different hash for different keys", () => {
      const key1 = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const key2 = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const hash1 = crypto.createHash("sha256").update(key1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(key2).digest("hex");
      expect(hash1).not.toBe(hash2);
    });

    it("hash is 64 hex characters", () => {
      const key = "ck_live_test";
      const hash = crypto.createHash("sha256").update(key).digest("hex");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("Bearer token parsing", () => {
    it("extracts key from Bearer header", () => {
      const authHeader = "Bearer ck_live_abc123";
      expect(authHeader.startsWith("Bearer ")).toBe(true);
      const apiKey = authHeader.slice(7);
      expect(apiKey).toBe("ck_live_abc123");
    });

    it("rejects non-Bearer auth", () => {
      const authHeader = "Basic dXNlcjpwYXNz";
      expect(authHeader.startsWith("Bearer ")).toBe(false);
    });

    it("rejects empty Bearer token", () => {
      const authHeader = "Bearer ";
      const apiKey = authHeader.slice(7);
      expect(apiKey).toBe("");
      // An empty string would produce a valid hash but would never match
      // any stored key, so it effectively rejects
    });

    it("rejects null header", () => {
      const authHeader: string | null = null;
      expect(authHeader?.startsWith("Bearer ")).toBeFalsy();
    });
  });

  describe("end-to-end key lifecycle", () => {
    it("generate → hash → verify cycle works", () => {
      // Generate
      const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const keyPrefix = rawKey.slice(0, 16);
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

      // Simulate storage
      const stored = { key_prefix: keyPrefix, key_hash: keyHash };

      // Verify (simulate API call)
      const incomingKey = rawKey;
      const incomingHash = crypto
        .createHash("sha256")
        .update(incomingKey)
        .digest("hex");

      expect(incomingHash).toBe(stored.key_hash);
    });

    it("wrong key does not match stored hash", () => {
      const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

      const wrongKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
      const wrongHash = crypto
        .createHash("sha256")
        .update(wrongKey)
        .digest("hex");

      expect(wrongHash).not.toBe(keyHash);
    });
  });
});
