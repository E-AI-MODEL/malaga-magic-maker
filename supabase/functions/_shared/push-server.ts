import * as webpush from "jsr:@negrel/webpush@0.5.0";

const APP_URL = "https://vakansie.app";

/** Only well-known browser push services; never arbitrary URLs from the database. */
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || (u.port && u.port !== "443")) return false;
    const h = u.hostname;
    return h === "fcm.googleapis.com" || h === "updates.push.services.mozilla.com" || h === "web.push.apple.com"
      || h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com");
  } catch { return false; }
}

// Untyped service client: generated table types are not available inside Edge Functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any;

export async function pushServer(db: Db) {
  const { data } = await db.from("push_server_keys").select("public_jwk, private_jwk").eq("id", 1).maybeSingle();
  let keys: CryptoKeyPair;
  if (data) {
    keys = await webpush.importVapidKeys({ publicKey: data.public_jwk, privateKey: data.private_jwk });
  } else {
    // First run: generate the server key pair here so the private key never leaves the backend.
    keys = await webpush.generateVapidKeys({ extractable: true });
    const exported = await webpush.exportVapidKeys(keys);
    const { error } = await db.from("push_server_keys").insert({
      id: 1, public_key: await webpush.exportApplicationServerKey(keys),
      public_jwk: exported.publicKey, private_jwk: exported.privateKey,
    });
    if (error) return pushServer(db); // another run won the race
  }
  return webpush.ApplicationServer.new({ contactInformation: APP_URL, vapidKeys: keys });
}

