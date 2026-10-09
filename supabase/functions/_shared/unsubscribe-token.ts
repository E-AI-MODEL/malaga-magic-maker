// Signed one-click unsubscribe tokens for reminder e-mails.
// Format: base64url("<userId>.<expiresAtSeconds>") + "." + base64url(HMAC-SHA256).
// Pure Web Crypto so it runs in Deno and in the test runner.

const enc = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UNSUBSCRIBE_TTL_SECONDS = 90 * 86_400;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const s = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  } catch { return null; }
}
async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signUnsubscribeToken(userId: string, secret: string, now = new Date()): Promise<string> {
  if (!UUID.test(userId) || !secret) throw new Error("invalid input");
  const payload = `${userId}.${Math.floor(now.getTime() / 1000) + UNSUBSCRIBE_TTL_SECONDS}`;
  return `${b64url(enc.encode(payload))}.${b64url(await hmac(secret, payload))}`;
}

/** Returns the user id for a valid, unexpired token; otherwise null. */
export async function verifyUnsubscribeToken(token: string, secret: string, now = new Date()): Promise<string | null> {
  if (!secret || typeof token !== "string" || token.length > 300) return null;
  const [p, s, extra] = token.split(".");
  if (!p || !s || extra !== undefined) return null;
  const payloadBytes = fromB64url(p);
  const sig = fromB64url(s);
  if (!payloadBytes || !sig) return null;
  const payload = new TextDecoder().decode(payloadBytes);
  if (!sameBytes(sig, await hmac(secret, payload))) return null;
  const [userId, exp] = payload.split(".");
  if (!UUID.test(userId || "") || !/^\d+$/.test(exp || "")) return null;
  if (Number(exp) * 1000 < now.getTime()) return null;
  return userId.toLowerCase();
}
