import "server-only";

// Notifications : un fichier par session abonnée, dans .data/push/<viewerId>.json.
//
// Pour vérifier Pronote quand l'app est fermée, le serveur doit pouvoir rouvrir la session sans
// le cookie de l'élève. On garde donc la clé de session, chiffrée (AES-256-GCM) avec une clé
// dérivée de APP_SESSION_SECRET : le disque seul ne suffit pas à la lire, mais le serveur, lui,
// le peut. C'est le compromis des notifications, accepté explicitement par l'élève qui les active
// (expliqué dans Réglages › Notifications et sur la page Confidentialité). Désactiver les
// notifications, se déconnecter ou laisser la session expirer supprime le fichier.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isViewerId, PUSH_DIR, pushFileOf } from "@/lib/auth/session-store";
import { DEFAULT_PREFS, parsePrefs, type PushPrefs, type Snapshot } from "./changes";
import { generateVapidKeys, type PushSubscriptionData, type VapidKeys } from "./web-push";

type StoredPush = {
  v: 1;
  createdAt: number;
  subscription: PushSubscriptionData;
  prefs: PushPrefs;
  iv: string;
  tag: string;
  /** Clé de session (32 octets), chiffrée avec la clé du serveur. */
  data: string;
  snapshot?: Snapshot;
  lastCheckAt?: number;
  /** Échecs d'envoi d'affilée : au-delà d'un seuil, l'abonnement est abandonné. */
  failures?: number;
  /** Expiration de session déjà signalée (pour ne prévenir qu'une fois). */
  expiryWarnedFor?: number;
};

export type PushRecord = Omit<StoredPush, "v" | "iv" | "tag" | "data">;

function serverKey(): Buffer {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SESSION_SECRET manquant");
  return Buffer.from(hkdfSync("sha256", secret, "bloomy", "push-session-key-v1", 32));
}

async function writeJson(file: string, value: unknown) {
  await mkdir(PUSH_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, file);
}

async function read(viewerId: string): Promise<StoredPush | null> {
  try {
    const stored = JSON.parse(await readFile(pushFileOf(viewerId), "utf8")) as StoredPush;
    return stored.v === 1 ? stored : null;
  } catch {
    return null;
  }
}

/** Active (ou remplace) les notifications de cette session. */
export async function savePushSubscription(
  viewerId: string,
  sessionKey: Buffer,
  subscription: PushSubscriptionData,
  prefs: PushPrefs = DEFAULT_PREFS,
): Promise<void> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", serverKey(), iv);
  cipher.setAAD(Buffer.from(viewerId));
  const data = Buffer.concat([cipher.update(sessionKey), cipher.final()]);
  const previous = await read(viewerId);
  await writeJson(pushFileOf(viewerId), {
    v: 1,
    createdAt: previous?.createdAt ?? Date.now(),
    subscription,
    prefs,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
    // Même appareil : on garde l'instantané, pour ne pas renvoyer ce qui a déjà été signalé.
    snapshot: previous?.snapshot,
  } satisfies StoredPush);
}

export async function getPushRecord(viewerId: string): Promise<PushRecord | null> {
  const stored = await read(viewerId);
  if (!stored) return null;
  const { createdAt, subscription, prefs, snapshot, lastCheckAt, failures, expiryWarnedFor } = stored;
  return { createdAt, subscription, prefs: parsePrefs(prefs), snapshot, lastCheckAt, failures, expiryWarnedFor };
}

/** Clé de session pour une vérification en arrière-plan, ou `null` si illisible. */
export async function openPushSessionKey(viewerId: string): Promise<Buffer | null> {
  const stored = await read(viewerId);
  if (!stored) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", serverKey(), Buffer.from(stored.iv, "base64"));
    decipher.setAAD(Buffer.from(viewerId));
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(stored.data, "base64")), decipher.final()]);
  } catch {
    return null; // secret du serveur changé : l'abonnement ne peut plus servir
  }
}

/** Met à jour une partie de l'enregistrement (préférences, instantané, échecs). */
export async function updatePushRecord(
  viewerId: string,
  patch: Partial<Pick<StoredPush, "prefs" | "snapshot" | "lastCheckAt" | "failures" | "expiryWarnedFor">>,
): Promise<void> {
  const stored = await read(viewerId);
  if (!stored) return;
  await writeJson(pushFileOf(viewerId), { ...stored, ...patch });
}

export async function deletePushSubscription(viewerId: string): Promise<void> {
  await rm(pushFileOf(viewerId), { force: true });
}

/** Sessions abonnées aux notifications. */
export async function listPushViewers(): Promise<string[]> {
  try {
    return (await readdir(PUSH_DIR)).map((n) => n.replace(/\.json$/, "")).filter(isViewerId);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Clés VAPID du serveur                                                */
/* ------------------------------------------------------------------ */

const VAPID_FILE = () => `${PUSH_DIR}/vapid.json`;
let vapidCache: VapidKeys | null = null;

/**
 * Clés VAPID (identité du serveur auprès des services de push), créées au premier besoin et gardées
 * dans .data/push/vapid.json. `subject` : adresse du site, transmise aux services de push comme contact.
 * Les changer désabonnerait tous les appareils : on ne les régénère jamais.
 */
export async function getVapidKeys(origin?: string): Promise<VapidKeys | null> {
  if (vapidCache) return vapidCache;
  try {
    vapidCache = JSON.parse(await readFile(VAPID_FILE(), "utf8")) as VapidKeys;
    return vapidCache;
  } catch {
    if (!origin) return null;
  }
  const subject = process.env.PUSH_CONTACT || origin;
  vapidCache = { ...generateVapidKeys(), subject };
  await mkdir(PUSH_DIR, { recursive: true, mode: 0o700 });
  await writeFile(VAPID_FILE(), JSON.stringify(vapidCache), { mode: 0o600, flag: "wx" }).catch(async () => {
    // Créé entre-temps par une autre requête : on reprend celui-là.
    vapidCache = JSON.parse(await readFile(VAPID_FILE(), "utf8")) as VapidKeys;
  });
  return vapidCache;
}
