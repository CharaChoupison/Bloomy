// Page à rouvrir après la connexion (/login?suivant=/devoirs), partagé proxy / serveur / client.
//
// Cas d'usage : le widget iPhone ouvre Safari sur /devoirs ; sans session, le proxy renvoie vers
// /login?suivant=/devoirs, puis la connexion (et l'onboarding éventuel) ramène sur /devoirs.
//
// Sécurité (redirection ouverte) : la valeur vient de l'URL, donc de n'importe qui. On n'accepte
// qu'un chemin interne à l'app : pas d'autre origine (« //site », « /\site », « https:… »), pas de
// caractère de contrôle, et pas les pages de connexion ou les routes API.

export const NEXT_PARAM = "suivant";

const ORIGIN = "http://pronoti.invalid";
const EXCLUDED = /^\/(login|bienvenue|api)(\/|$)/;

/** Chemin interne sûr (pathname + query), ou undefined si la valeur est absente ou douteuse. */
export function safeNextPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return undefined;

  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return undefined;
  }
  // Après normalisation, « /x/..//site » devient « //site » : on revérifie le chemin obtenu.
  if (url.origin !== ORIGIN || url.pathname.startsWith("//") || EXCLUDED.test(url.pathname) || url.pathname === "/") {
    return undefined;
  }
  return url.pathname + url.search;
}

/** Lit ?suivant= dans une query string (navigateur : location.search). */
export const nextPathFromSearch = (search: string) => safeNextPath(new URLSearchParams(search).get(NEXT_PARAM));
