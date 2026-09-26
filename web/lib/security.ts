import { createCipheriv, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export async function validatePublicEndpoint(raw: string): Promise<string> {
  const value = new URL(raw);
  if (value.protocol !== "https:" || value.username || value.password || (value.port && value.port !== "443")) {
    throw new Error("Endpoint must be a public HTTPS URL on port 443.");
  }
  const addresses = await lookup(value.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Endpoint resolves to a restricted network address.");
  }
  value.pathname = value.pathname.replace(/\/$/, "");
  return value.toString().replace(/\/$/, "");
}

function isPublicAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127));
  }
  const normalized = address.toLowerCase();
  return kind === 6 && !(normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb"));
}

export function encryptCredential(token: string, organizationId: string, runId: string) {
  const key = Buffer.from(process.env.ARENA_CREDENTIAL_KEY ?? "", "base64url");
  if (key.length !== 32) throw new Error("ARENA_CREDENTIAL_KEY must decode to 32 bytes.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`${organizationId}:${runId}`));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64url"), nonce: nonce.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    keyId: process.env.ARENA_CREDENTIAL_KEY_ID ?? "v1",
  };
}
