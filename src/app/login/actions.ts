"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { instance } from "pawnote";
import { clientIp, RateLimiter } from "@/lib/auth/rate-limit";
import { createSession, endSession } from "@/lib/auth/session";
import { viewerTag } from "@/lib/pronote/cache-tags";
import { adoptSession, connectWithPassword, dropSession } from "@/lib/pronote/client";
import { pronoteFetcher } from "@/lib/pronote/fetcher";
import { defaultInstanceUrl, isAllowedInstance, isSingleInstance, parseInstanceUrl } from "@/lib/pronote/network";
import { ONBOARDED_COOKIE } from "@/lib/preferences";

export type LoginField = "url" | "username" | "password";
export type LoginState = {
  error?: string;
  /** Champ concerné par l'erreur ; sans champ, l'erreur s'affiche en bandeau au-dessus du formulaire. */
  field?: LoginField;
  /** Valeurs à remettre dans le formulaire après une erreur (jamais le mot de passe). */
  values?: { url: string; username: string };
};

const WINDOW_MS = 15 * 60 * 1000;
// Par appareil (IP) : toutes les tentatives, réussies ou non. Bloque le balayage de comptes
// et la création de sessions en masse.
const attemptsByIp = new RateLimiter(WINDOW_MS, 20);
// Par compte Pronote : les échecs seulement. Protège aussi l'élève : trop d'échecs côté Pronote
// peuvent faire suspendre son compte ou l'IP du serveur.
const failuresByAccount = new RateLimiter(WINDOW_MS, 5);

const TOO_MANY = "Trop de tentatives. Réessaie dans quelques minutes.";
const slowDown = () => new Promise((r) => setTimeout(r, 800)); // ralentit les essais en rafale

/** Vrai si l'établissement passe par un ENT (connexion par identifiant Pronote souvent impossible). */
async function usesEnt(url: string): Promise<boolean> {
  try {
    return !!(await instance(url, pronoteFetcher)).casURL;
  } catch {
    return false;
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawUrl = String(formData.get("url") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { url: rawUrl, username };
  const fail = (error: string, field?: LoginField): LoginState => ({ error, field, values });

  const ip = await clientIp();
  if (attemptsByIp.isLimited(ip)) return fail(TOO_MANY);

  const url = isSingleInstance() ? defaultInstanceUrl() : parseInstanceUrl(rawUrl);
  if (!url) return fail("Colle l'adresse de la page Pronote de ton établissement.", "url");
  if (!isAllowedInstance(url)) return fail("Pronoti n'est pas encore ouvert à cet établissement.", "url");
  if (!username || username.length > 100) return fail("Saisis ton identifiant Pronote.", "username");
  if (!password || password.length > 200) return fail("Saisis ton mot de passe Pronote.", "password");

  const accountKey = `${new URL(url).hostname}|${username.toLowerCase()}`;
  if (failuresByAccount.isLimited(accountKey)) return fail(TOO_MANY);
  attemptsByIp.record(ip);

  let connection: Awaited<ReturnType<typeof connectWithPassword>>;
  try {
    connection = await connectWithPassword({ url, username, password });
  } catch (error) {
    const name = (error as Error).name;
    if (name === "BadCredentialsError") {
      failuresByAccount.record(accountKey);
      await slowDown();
      const hint = (await usesEnt(url))
        ? " Si tu passes d'habitude par l'ENT, utilise l'identifiant et le mot de passe propres à Pronote."
        : "";
      return fail(`Identifiant ou mot de passe incorrect.${hint}`, "password");
    }
    if (name === "AccountDisabledError") return fail("Ce compte Pronote est désactivé.");
    if (name === "AccessDeniedError") return fail("Ce compte n'a pas accès à l'espace élève de Pronote.");
    if (name === "SuspendedIPError" || name === "RateLimitedError") {
      return fail("Pronote limite les connexions pour le moment. Réessaie dans quelques minutes.");
    }
    if (name === "BlockedDestinationError") return fail("Cette adresse ne correspond pas à un serveur Pronote.", "url");
    console.error("[pronote] connexion", error);
    return fail("Impossible de joindre Pronote. Vérifie l'adresse ou réessaie dans un instant.");
  }

  failuresByAccount.clear(accountKey);
  const viewer = await createSession(connection.credentials);
  adoptSession(viewer.id, connection.session);

  // Première connexion sur cet appareil : on propose de choisir sa couleur et son apparence.
  const onboarded = (await cookies()).get(ONBOARDED_COOKIE)?.value === "1";
  redirect(onboarded ? "/" : "/bienvenue");
}

export async function logout(): Promise<void> {
  const viewer = await endSession();
  if (viewer) {
    dropSession(viewer.id);
    updateTag(viewerTag(viewer.id)); // vide tout de suite les données en cache de cet élève
  }
  redirect("/login");
}
