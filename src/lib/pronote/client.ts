import "server-only";
import { randomUUID } from "node:crypto";
import {
  AccountKind,
  createSessionHandle,
  loginCredentials,
  loginToken,
  type RefreshInformation,
  type SessionHandle,
} from "pawnote";
import { forgetKey, recallKey } from "@/lib/auth/keyring";
import {
  deleteStoredSession,
  readStoredSession,
  updateStoredSession,
  type PronoteCredentials,
} from "@/lib/auth/session-store";
import { pronoteFetcher } from "./fetcher";

// Une session Pronote ouverte par appareil connecté, gardée en mémoire et réutilisée entre les requêtes.
// La table est sur globalThis pour survivre au rechargement à chaud (HMR) de `next dev`,
// sinon chaque modification de fichier déclencherait une nouvelle connexion.
const SESSION_MAX_AGE_MS = 10 * 60 * 1000;

type Entry = { cached?: { session: SessionHandle; createdAt: number }; pending?: Promise<SessionHandle> };
const store = globalThis as typeof globalThis & { __pronoteSessions?: Map<string, Entry> };
const sessions = (store.__pronoteSessions ??= new Map());

/** Le jeton enregistré n'est plus accepté par Pronote : l'élève doit se reconnecter. */
export class PronoteSessionLostError extends Error {
  constructor() {
    super("Session Pronote perdue, reconnexion nécessaire");
    this.name = "PronoteSessionLostError";
  }
}

/** Erreurs de Pawnote qui veulent dire « Pronote refuse ce compte », par opposition à une panne. */
const REJECTIONS = new Set(["BadCredentialsError", "AuthenticateError", "AccountDisabledError", "AccessDeniedError"]);
export const isRejection = (error: unknown) => REJECTIONS.has((error as Error)?.name);

const toCredentials = (refresh: RefreshInformation, deviceUUID: string): PronoteCredentials => ({
  url: refresh.url,
  username: refresh.username,
  token: refresh.token,
  deviceUUID,
  navigatorIdentifier: refresh.navigatorIdentifier,
});

/**
 * Première connexion avec identifiant et mot de passe. Le mot de passe sert une seule fois :
 * Pronote renvoie un jeton, seul enregistré ensuite. Chaque appareil reçoit son propre deviceUUID.
 */
export async function connectWithPassword(input: { url: string; username: string; password: string }) {
  const session = createSessionHandle(pronoteFetcher);
  const deviceUUID = randomUUID();
  const refresh = await loginCredentials(session, {
    url: input.url,
    kind: AccountKind.STUDENT,
    username: input.username,
    password: input.password,
    deviceUUID,
  });
  return { session, credentials: toCredentials(refresh, deviceUUID) };
}

/** Garde en mémoire la session ouverte par la connexion, pour ne pas se reconnecter tout de suite. */
export function adoptSession(viewerId: string, session: SessionHandle): void {
  sessions.set(viewerId, { cached: { session, createdAt: Date.now() } });
}

/** Oublie la session Pronote d'un appareil (déconnexion). */
export function dropSession(viewerId: string): void {
  sessions.delete(viewerId);
}

async function reopen(viewerId: string): Promise<SessionHandle> {
  const key = recallKey(viewerId);
  const saved = key && (await readStoredSession(viewerId, key));
  if (!key || !saved) throw new PronoteSessionLostError();

  const session = createSessionHandle(pronoteFetcher);
  let refresh: RefreshInformation;
  try {
    refresh = await loginToken(session, {
      url: saved.url,
      kind: AccountKind.STUDENT,
      username: saved.username,
      token: saved.token,
      deviceUUID: saved.deviceUUID,
      navigatorIdentifier: saved.navigatorIdentifier,
    });
  } catch (error) {
    if (!isRejection(error)) throw error; // panne réseau ou Pronote indisponible : on garde la session
    console.warn("[pronote] Jeton refusé, session supprimée :", (error as Error).message);
    await deleteStoredSession(viewerId);
    forgetKey(viewerId);
    throw new PronoteSessionLostError();
  }
  // Le jeton a changé : sans l'enregistrer, la connexion suivante échouerait.
  await updateStoredSession(viewerId, key, toCredentials(refresh, saved.deviceUUID));
  return session;
}

function sweep(now: number) {
  for (const [id, entry] of sessions) {
    if (!entry.pending && (!entry.cached || now - entry.cached.createdAt >= SESSION_MAX_AGE_MS)) sessions.delete(id);
  }
}

async function getSession(viewerId: string, forceNew = false): Promise<SessionHandle> {
  const now = Date.now();
  sweep(now);
  const entry: Entry = sessions.get(viewerId) ?? {};
  sessions.set(viewerId, entry);
  if (!forceNew && entry.cached && now - entry.cached.createdAt < SESSION_MAX_AGE_MS) return entry.cached.session;

  // Si plusieurs requêtes du même appareil arrivent en même temps, elles attendent la même connexion
  // (sinon chacune ferait tourner le jeton et invaliderait celui des autres).
  entry.pending ??= reopen(viewerId)
    .then((session) => {
      entry.cached = { session, createdAt: Date.now() };
      return session;
    })
    .finally(() => {
      entry.pending = undefined;
    });
  return entry.pending;
}

/**
 * Exécute une requête Pawnote avec la session Pronote de cet élève, et se reconnecte une fois si elle a expiré.
 * `viewerId` vient toujours de verifySession() / getViewer() : jamais d'une entrée utilisateur.
 */
export async function withPronote<T>(viewerId: string, fn: (session: SessionHandle) => Promise<T>): Promise<T> {
  try {
    return await fn(await getSession(viewerId));
  } catch (error) {
    if ((error as Error).name !== "SessionExpiredError") throw error;
    return fn(await getSession(viewerId, true));
  }
}
