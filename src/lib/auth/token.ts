// Cookie de session : "<sid>.<clé>.<expiration en ms>.<signature HMAC-SHA256>", tout en base64url.
// - sid : identifiant aléatoire de la session (256 bits). Le serveur ne le stocke jamais tel quel,
//   seulement son empreinte SHA-256 (viewerId), qui nomme le fichier de session et sert de clé de cache.
// - clé : clé AES-256 aléatoire qui chiffre le jeton Pronote de cette session sur le disque.
//   Elle n'existe que dans ce cookie : une copie du disque du serveur est donc illisible seule.
// - signature : empêche de fabriquer ou de modifier un cookie (secret APP_SESSION_SECRET).
// Pas de "server-only" ici : proxy.ts importe ce fichier, et il est compilé à part.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "pronoti_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

const VERSION = "v2"; // les cookies v1 (ancien mot de passe d'accès unique) deviennent invalides
const B64 = /^[A-Za-z0-9_-]+$/;

export type SessionCookie = { sid: string; key: Buffer; expiresAt: number };

function secret(): string {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("APP_SESSION_SECRET manquant ou trop court (32 caractères minimum) dans .env.local");
  }
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`${VERSION}.${payload}`).digest();

/** Empreinte non secrète d'une session : nom de son fichier et clé des caches Next.js. */
export const viewerIdOf = (sid: string) => createHash("sha256").update(sid).digest("hex");

export function newSessionCookie(): SessionCookie {
  return {
    sid: randomBytes(32).toString("base64url"),
    key: randomBytes(32),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
}

export function encodeSessionCookie({ sid, key, expiresAt }: SessionCookie): string {
  const payload = `${sid}.${key.toString("base64url")}.${expiresAt}`;
  return `${payload}.${sign(payload).toString("base64url")}`;
}

/** Cookie décodé si sa signature est bonne et qu'il n'a pas expiré, sinon `null`. */
export function decodeSessionCookie(value: string | undefined): SessionCookie | null {
  if (!value || value.length > 300) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [sid, keyB64, exp, signature] = parts;
  if (![sid, keyB64, signature].every((p) => B64.test(p))) return null;

  const expected = sign(`${sid}.${keyB64}.${exp}`);
  const actual = Buffer.from(signature, "base64url");
  // Comparaison en temps constant : pas de fuite par mesure du temps de réponse.
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const expiresAt = Number(exp);
  const key = Buffer.from(keyB64, "base64url");
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || key.length !== 32) return null;
  return { sid, key, expiresAt };
}
