import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { forgetKey, rememberKey } from "./keyring";
import {
  createStoredSession,
  deleteStoredSession,
  purgeExpiredSessions,
  sessionExists,
  type PronoteCredentials,
} from "./session-store";
import { decodeSessionCookie, encodeSessionCookie, newSessionCookie, SESSION_COOKIE, viewerIdOf } from "./token";

/**
 * L'élève connecté sur cet appareil. `id` est l'empreinte de sa session : non secrète,
 * c'est elle qui sépare les caches et les sessions Pronote des différents élèves.
 */
export type Viewer = { id: string };

/** Crée la session après une connexion Pronote réussie, et renvoie l'élève. */
export async function createSession(credentials: PronoteCredentials): Promise<Viewer> {
  const cookie = newSessionCookie();
  const id = viewerIdOf(cookie.sid);
  await purgeExpiredSessions().catch(() => {});
  await createStoredSession(id, cookie.key, cookie.expiresAt, credentials);
  rememberKey(id, cookie.key);

  (await cookies()).set(SESSION_COOKIE, encodeSessionCookie(cookie), {
    httpOnly: true, // illisible depuis le JavaScript de la page
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(cookie.expiresAt),
  });
  return { id };
}

/**
 * Élève de la requête courante, ou `null` : cookie absent, falsifié, expiré, ou session supprimée
 * (déconnexion, jeton Pronote refusé). Mémorisé le temps d'un rendu.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const decoded = decodeSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  // La vérification compare l'expiration à Date.now() : avec cacheComponents, il faut signaler
  // explicitement que ce calcul se fait au moment de la requête (et jamais pendant un prérendu).
  await connection();
  if (!decoded) return null;
  const id = viewerIdOf(decoded.sid);
  if (!(await sessionExists(id))) return null;
  rememberKey(id, decoded.key);
  return { id };
});

/** Vrai si la requête courante vient d'un élève connecté. */
export async function hasValidSession(): Promise<boolean> {
  return (await getViewer()) !== null;
}

/**
 * Data Access Layer : à appeler juste avant de lire des données Pronote
 * (page, route API, server action). proxy.ts filtre déjà, mais on revérifie au plus près des données.
 */
export async function verifySession(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** Supprime la session de cet appareil (fichier, clé en mémoire et cookie). Renvoie l'élève s'il y en avait un. */
export async function endSession(): Promise<Viewer | null> {
  const jar = await cookies();
  const decoded = decodeSessionCookie(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  if (!decoded) return null;
  const id = viewerIdOf(decoded.sid);
  forgetKey(id);
  await deleteStoredSession(id);
  return { id };
}
