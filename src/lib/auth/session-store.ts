// Sessions enregistrées sur le serveur : un fichier par appareil connecté, dans .data/sessions/.
// Chaque fichier contient le jeton Pronote de la session, chiffré en AES-256-GCM avec la clé
// qui n'existe que dans le cookie de l'élève (voir token.ts). Le mot de passe Pronote n'y est jamais.
// Pas de "server-only" ici : proxy.ts importe sessionExists().

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Ce qu'il faut pour rouvrir la session Pronote sans mot de passe. */
export type PronoteCredentials = {
  url: string;
  username: string;
  /** Jeton Pawnote : il change à CHAQUE connexion, on garde toujours le dernier reçu. */
  token: string;
  /** Le jeton n'est valable qu'avec le même identifiant d'appareil. */
  deviceUUID: string;
  navigatorIdentifier: string;
};

type StoredSession = {
  v: 1;
  expiresAt: number;
  iv: string;
  tag: string;
  data: string;
};

// turbopackIgnore : dossier lu à l'exécution, pas au build. En production, .data est un lien
// vers /opt/pronoti/shared (hors du projet) et Turbopack planterait en essayant de l'embarquer.
const SESSIONS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "sessions");
/** Accès des widgets (voir widget-store.ts) : un fichier par session, supprimé avec elle. */
export const WIDGETS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "widgets");
const HEX_ID = /^[0-9a-f]{64}$/;

/** Vrai si la valeur a la forme d'un viewerId (empreinte SHA-256 en hexadécimal). */
export const isViewerId = (value: string) => HEX_ID.test(value);

function fileOf(viewerId: string, dir = SESSIONS_DIR): string {
  // L'identifiant vient toujours de viewerIdOf(), mais on refuse tout ce qui pourrait sortir du dossier.
  if (!HEX_ID.test(viewerId)) throw new Error("Identifiant de session invalide");
  return path.join(dir, `${viewerId}.json`);
}

export const widgetFileOf = (viewerId: string) => fileOf(viewerId, WIDGETS_DIR);

function encrypt(viewerId: string, key: Buffer, credentials: PronoteCredentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(viewerId)); // lie le contenu à ce fichier : impossible de l'échanger avec un autre
  const data = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

async function write(viewerId: string, stored: StoredSession): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true, mode: 0o700 });
  const file = fileOf(viewerId);
  // Écriture atomique : fichier temporaire puis renommage, pour ne jamais laisser un jeton à moitié écrit.
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(stored), { mode: 0o600 });
  await rename(tmp, file);
}

async function read(viewerId: string): Promise<StoredSession | null> {
  try {
    const stored = JSON.parse(await readFile(fileOf(viewerId), "utf8")) as StoredSession;
    if (stored.v !== 1 || stored.expiresAt < Date.now()) return null;
    return stored;
  } catch {
    return null;
  }
}

export async function createStoredSession(
  viewerId: string,
  key: Buffer,
  expiresAt: number,
  credentials: PronoteCredentials,
): Promise<void> {
  await write(viewerId, { v: 1, expiresAt, ...encrypt(viewerId, key, credentials) });
}

/**
 * Enregistre le nouveau jeton après une reconnexion. Ne recrée pas une session supprimée entre-temps
 * (déconnexion pendant que la reconnexion était en cours).
 */
export async function updateStoredSession(viewerId: string, key: Buffer, credentials: PronoteCredentials): Promise<void> {
  const current = await read(viewerId);
  if (!current) return;
  await write(viewerId, { ...current, ...encrypt(viewerId, key, credentials) });
}

/** Jeton Pronote déchiffré, ou `null` si la session n'existe plus ou si la clé ne correspond pas. */
export async function readStoredSession(viewerId: string, key: Buffer): Promise<PronoteCredentials | null> {
  const stored = await read(viewerId);
  if (!stored) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
    decipher.setAAD(Buffer.from(viewerId));
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(stored.data, "base64")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as PronoteCredentials;
  } catch {
    return null;
  }
}

/** Date d'expiration de la session (ms), ou `null` si elle n'existe plus. */
export async function storedSessionExpiry(viewerId: string): Promise<number | null> {
  return (await read(viewerId))?.expiresAt ?? null;
}

/** Vrai si la session existe encore sur le serveur (pas déconnectée, pas expirée). Lecture légère pour proxy.ts. */
export async function sessionExists(viewerId: string): Promise<boolean> {
  try {
    return (await stat(fileOf(viewerId))).isFile();
  } catch {
    return false;
  }
}

/** Supprime la session et l'accès widget qui en dépend (déconnexion, jeton refusé, expiration). */
export async function deleteStoredSession(viewerId: string): Promise<void> {
  await Promise.all([rm(fileOf(viewerId), { force: true }), rm(widgetFileOf(viewerId), { force: true })]);
}

/** Supprime les sessions expirées (appelé à chaque connexion, c'est assez fréquent). */
export async function purgeExpiredSessions(): Promise<void> {
  let names: string[];
  try {
    names = await readdir(SESSIONS_DIR);
  } catch {
    return;
  }
  await Promise.all(
    names.map(async (name) => {
      const viewerId = name.replace(/\.json$/, "");
      if (!HEX_ID.test(viewerId)) return;
      if (!(await read(viewerId))) await deleteStoredSession(viewerId);
    }),
  );
}
