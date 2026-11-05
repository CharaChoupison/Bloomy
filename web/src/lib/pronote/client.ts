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
import { pronoteFetcher } from "./fetcher";
import { readToken, writeToken } from "./token-store";

// On garde UNE session Pronote ouverte côté serveur et on la réutilise entre les requêtes.
// Elle est stockée sur globalThis pour survivre au rechargement à chaud (HMR) de `next dev`,
// sinon chaque modification de fichier déclencherait une nouvelle connexion.
const SESSION_MAX_AGE_MS = 10 * 60 * 1000;

type Cached = { session: SessionHandle; createdAt: number };
const store = globalThis as typeof globalThis & {
  __pronote?: { cached?: Cached; pending?: Promise<SessionHandle> };
};
const state = (store.__pronote ??= {});

async function persist(refresh: RefreshInformation, deviceUUID: string): Promise<void> {
  await writeToken({
    url: refresh.url,
    username: refresh.username,
    token: refresh.token,
    deviceUUID,
    navigatorIdentifier: refresh.navigatorIdentifier,
  });
}

async function login(): Promise<SessionHandle> {
  const session = createSessionHandle(pronoteFetcher);
  const saved = await readToken();

  if (saved) {
    try {
      const refresh = await loginToken(session, {
        url: saved.url,
        kind: AccountKind.STUDENT,
        username: saved.username,
        token: saved.token,
        deviceUUID: saved.deviceUUID,
        navigatorIdentifier: saved.navigatorIdentifier,
      });
      await persist(refresh, saved.deviceUUID);
      return session;
    } catch (error) {
      console.warn("[pronote] Token refusé, tentative avec le mot de passe :", (error as Error).message);
    }
  }

  // Secours : identifiant + mot de passe, seulement s'ils sont fournis dans .env.local.
  const { PRONOTE_URL, PRONOTE_USERNAME, PRONOTE_PASSWORD } = process.env;
  if (!PRONOTE_URL || !PRONOTE_USERNAME || !PRONOTE_PASSWORD) {
    throw new Error(
      "Aucun token Pronote valide et pas d'identifiants dans .env.local (PRONOTE_URL, PRONOTE_USERNAME, PRONOTE_PASSWORD).",
    );
  }
  const fresh = createSessionHandle(pronoteFetcher);
  const deviceUUID = saved?.deviceUUID ?? randomUUID();
  const refresh = await loginCredentials(fresh, {
    url: PRONOTE_URL,
    kind: AccountKind.STUDENT,
    username: PRONOTE_USERNAME,
    password: PRONOTE_PASSWORD,
    deviceUUID,
  });
  await persist(refresh, deviceUUID);
  return fresh;
}

async function getSession(forceNew = false): Promise<SessionHandle> {
  const { cached } = state;
  if (!forceNew && cached && Date.now() - cached.createdAt < SESSION_MAX_AGE_MS) {
    return cached.session;
  }
  // Si plusieurs requêtes arrivent en même temps, elles attendent la même connexion
  // (sinon chacune ferait tourner le token et invaliderait celui des autres).
  state.pending ??= login()
    .then((session) => {
      state.cached = { session, createdAt: Date.now() };
      return session;
    })
    .finally(() => {
      state.pending = undefined;
    });
  return state.pending;
}

/** Exécute une requête Pawnote avec une session valide, et se reconnecte une fois si elle a expiré. */
export async function withPronote<T>(fn: (session: SessionHandle) => Promise<T>): Promise<T> {
  try {
    return await fn(await getSession());
  } catch (error) {
    if ((error as Error).name !== "SessionExpiredError") throw error;
    return fn(await getSession(true));
  }
}
