// Envoi de notifications Web Push, sans dépendance : chiffrement du message (RFC 8291, aes128gcm)
// et authentification du serveur auprès du service de push (VAPID, RFC 8292), avec node:crypto.
// Le contenu est chiffré pour l'appareil : Apple, Google ou Mozilla ne peuvent pas le lire.

import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign, type KeyObject } from "node:crypto";

export type PushSubscriptionData = { endpoint: string; keys: { p256dh: string; auth: string } };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

const b64u = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

/** Services de push des navigateurs : on n'envoie jamais de requête ailleurs (anti-SSRF). */
const PUSH_HOSTS = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

/** Vérifie et normalise un abonnement reçu du navigateur ; `null` s'il est invalide ou suspect. */
export function parseSubscription(value: unknown): PushSubscriptionData | null {
  const v = value as Partial<PushSubscriptionData> | null;
  if (!v || typeof v.endpoint !== "string" || v.endpoint.length > 1000) return null;
  let url: URL;
  try {
    url = new URL(v.endpoint);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  const p256dh = v.keys?.p256dh;
  const auth = v.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (fromB64u(p256dh).length !== 65 || fromB64u(auth).length !== 16) return null;
  return { endpoint: url.href, keys: { p256dh, auth } };
}

/** Nouvelle paire de clés VAPID (P-256), en base64url : clé publique brute et clé privée brute. */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

function vapidPrivateKey(keys: VapidKeys): KeyObject {
  const pub = fromB64u(keys.publicKey);
  return createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: b64u(pub.subarray(1, 33)),
      y: b64u(pub.subarray(33, 65)),
    },
  });
}

/** En-tête Authorization VAPID pour un service de push donné (jeton valable 12 h). */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()): string {
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(
    Buffer.from(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: vapidPrivateKey(keys), dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64u(signature)}, k=${keys.publicKey}`;
}

const RECORD_SIZE = 4096;

/**
 * Chiffre un message pour un abonnement (RFC 8291, un seul enregistrement aes128gcm).
 * `salt` et `serverKeys` ne sont imposés que par les tests.
 */
export function encryptPayload(
  payload: Buffer,
  sub: PushSubscriptionData,
  salt: Buffer = randomBytes(16),
  serverEcdh = (() => {
    const e = createECDH("prime256v1");
    e.generateKeys();
    return e;
  })(),
): Buffer {
  if (payload.length > RECORD_SIZE - 17 - 86) throw new Error("Message de notification trop long");
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const asPublic = serverEcdh.getPublicKey();
  const shared = serverEcdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  // 0x02 : délimiteur du dernier (et seul) enregistrement, sans remplissage.
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

export type SendResult = "sent" | "gone" | "failed";

/**
 * Envoie une notification. « gone » : l'abonnement n'existe plus (désinstallation, permission
 * retirée) et doit être oublié.
 */
export async function sendPush(
  sub: PushSubscriptionData,
  message: unknown,
  keys: VapidKeys,
  { ttlSeconds = 6 * 3600, urgency = "normal", topic }: { ttlSeconds?: number; urgency?: "low" | "normal" | "high"; topic?: string } = {},
): Promise<SendResult> {
  const body = encryptPayload(Buffer.from(JSON.stringify(message)), sub);
  try {
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(sub.endpoint, keys),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttlSeconds),
        Urgency: urgency,
        ...(topic ? { Topic: topic } : {}),
      },
      body: new Uint8Array(body),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.warn("[push] refus du service", res.status, await res.text().catch(() => ""));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.warn("[push] envoi impossible", (error as Error).message);
    return "failed";
  }
}
