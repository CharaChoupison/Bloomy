import "server-only";

// Accès en lecture seule pour le widget d'écran d'accueil (Scriptable sur iPhone).
//
// Le widget n'a pas le cookie de session, or la clé qui déchiffre le jeton Pronote n'existe que
// dans ce cookie (voir token.ts). On génère donc une clé propre au widget, et on enregistre la clé
// de session chiffrée avec elle, dans .data/widgets/<viewerId>.json :
// - le code d'accès donné à l'élève ("pw1.<viewerId>.<clé widget>") ne contient pas la clé de session ;
// - le disque du serveur seul ne permet pas de la retrouver ;
// - supprimer le fichier désactive le widget ; il disparaît aussi avec la session (session-store.ts).
// Un seul widget par session : en créer un nouveau invalide l'ancien code.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isViewerId, sessionExists, storedSessionExpiry, WIDGETS_DIR, widgetFileOf } from "./session-store";

const PREFIX = "pw1";
const B64 = /^[A-Za-z0-9_-]{43}$/; // 32 octets en base64url
/** On n'enregistre la dernière utilisation qu'une fois par heure : le widget se rafraîchit souvent. */
const TOUCH_EVERY_MS = 60 * 60 * 1000;

type StoredWidget = {
  v: 1;
  createdAt: number;
  lastUsedAt?: number;
  /** Couleur d'accent choisie dans Pronoti au moment de la création, reprise par le widget. */
  accent: string;
  iv: string;
  tag: string;
  /** Clé de session (32 octets), chiffrée en AES-256-GCM avec la clé du widget. */
  data: string;
};

export type WidgetStatus = { createdAt: number; lastUsedAt?: number; sessionExpiresAt: number };

async function read(viewerId: string): Promise<StoredWidget | null> {
  try {
    const stored = JSON.parse(await readFile(widgetFileOf(viewerId), "utf8")) as StoredWidget;
    return stored.v === 1 ? stored : null;
  } catch {
    return null;
  }
}

async function write(viewerId: string, stored: StoredWidget): Promise<void> {
  await mkdir(WIDGETS_DIR, { recursive: true, mode: 0o700 });
  const file = widgetFileOf(viewerId);
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(stored), { mode: 0o600 });
  await rename(tmp, file);
}

/** Crée (ou remplace) l'accès widget de cette session et renvoie le code à donner à l'élève, une seule fois. */
export async function createWidgetAccess(viewerId: string, sessionKey: Buffer, accent: string): Promise<string> {
  const widgetKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", widgetKey, iv);
  cipher.setAAD(Buffer.from(viewerId)); // lie le contenu à cette session
  const data = Buffer.concat([cipher.update(sessionKey), cipher.final()]);
  await write(viewerId, {
    v: 1,
    createdAt: Date.now(),
    accent,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
  return `${PREFIX}.${viewerId}.${widgetKey.toString("base64url")}`;
}

/**
 * Session correspondant à un code d'accès widget, ou `null` : code mal formé, désactivé, remplacé,
 * ou session terminée. Le viewerId n'est pas secret ; c'est la clé du widget qui fait foi.
 */
export async function openWidgetAccess(
  code: string,
): Promise<{ viewerId: string; sessionKey: Buffer; accent: string } | null> {
  const parts = code.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, viewerId, keyB64] = parts;
  if (!isViewerId(viewerId) || !B64.test(keyB64)) return null;

  const stored = await read(viewerId);
  if (!stored || !(await sessionExists(viewerId))) return null;

  let sessionKey: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyB64, "base64url"), Buffer.from(stored.iv, "base64"));
    decipher.setAAD(Buffer.from(viewerId));
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
    sessionKey = Buffer.concat([decipher.update(Buffer.from(stored.data, "base64")), decipher.final()]);
  } catch {
    return null; // mauvaise clé (ancien code, code inventé)
  }

  const now = Date.now();
  if (!stored.lastUsedAt || now - stored.lastUsedAt > TOUCH_EVERY_MS) {
    await write(viewerId, { ...stored, lastUsedAt: now }).catch(() => {});
  }
  return { viewerId, sessionKey, accent: stored.accent };
}

/** État de l'accès widget de cette session, pour l'écran de réglage. */
export async function widgetStatus(viewerId: string): Promise<WidgetStatus | null> {
  const [stored, sessionExpiresAt] = await Promise.all([read(viewerId), storedSessionExpiry(viewerId)]);
  if (!stored || !sessionExpiresAt) return null;
  return { createdAt: stored.createdAt, lastUsedAt: stored.lastUsedAt, sessionExpiresAt };
}

export async function deleteWidgetAccess(viewerId: string): Promise<void> {
  await rm(widgetFileOf(viewerId), { force: true });
}
