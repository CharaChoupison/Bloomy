import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isValidSession, SESSION_COOKIE, SESSION_DURATION_MS, signSession } from "./token";

export async function createSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  (await cookies()).set(SESSION_COOKIE, await signSession(expiresAt), {
    httpOnly: true, // illisible depuis le JavaScript de la page
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Vrai si la requête courante porte un cookie de session valide. */
export async function hasValidSession(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  // La vérification compare l'expiration à Date.now() : avec cacheComponents, il faut signaler
  // explicitement que ce calcul se fait au moment de la requête (et jamais pendant un prérendu).
  await connection();
  return isValidSession(value);
}

/**
 * Data Access Layer : à appeler juste avant de lire des données Pronote
 * (page, route API, server action). proxy.ts filtre déjà, mais on revérifie au plus près des données.
 */
export async function verifySession(): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");
}
