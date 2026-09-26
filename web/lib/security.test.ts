import { afterEach, describe, expect, it } from "vitest";

import { encryptCredential, validatePublicEndpoint } from "./security";

const originalKey = process.env.ARENA_CREDENTIAL_KEY;

afterEach(() => {
  process.env.ARENA_CREDENTIAL_KEY = originalKey;
});

describe("validatePublicEndpoint", () => {
  it.each([
    "http://models.example.com/v1",
    "https://user:password@models.example.com/v1",
    "https://models.example.com:8443/v1",
  ])("rejects unsafe endpoint %s", async (endpoint) => {
    await expect(validatePublicEndpoint(endpoint)).rejects.toThrow(
      "Endpoint must be a public HTTPS URL on port 443.",
    );
  });
});

describe("encryptCredential", () => {
  it("requires an AES-256 key", () => {
    process.env.ARENA_CREDENTIAL_KEY = Buffer.alloc(16).toString("base64url");
    expect(() => encryptCredential("secret", "org", "run")).toThrow(
      "ARENA_CREDENTIAL_KEY must decode to 32 bytes.",
    );
  });

  it("returns a fresh authenticated envelope without exposing the token", () => {
    process.env.ARENA_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64url");
    const first = encryptCredential("secret", "org", "run");
    const second = encryptCredential("secret", "org", "run");

    expect(first.ciphertext).not.toContain("secret");
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.tag).toBeTruthy();
  });
});
