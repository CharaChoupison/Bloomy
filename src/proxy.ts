import { NextResponse, type NextRequest } from "next/server";
import { sessionExists } from "@/lib/auth/session-store";
import { decodeSessionCookie, SESSION_COOKIE, viewerIdOf } from "@/lib/auth/token";
import { NEXT_PARAM, safeNextPath } from "@/lib/auth/next-path";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/confidentialite",
  // Service worker : doit rester joignable même session expirée (sinon il ne se met plus à jour).
  "/sw.js",
  // Widget d'écran d'accueil : pas de cookie, la route vérifie elle-même son code d'accès.
  "/api/widget",
  // Vérification des notifications : appelée par le serveur lui-même, la route vérifie son jeton.
  "/api/push/tick",
]);

async function isLoggedIn(request: NextRequest): Promise<boolean> {
  const decoded = decodeSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  // Le proxy tourne sous Node.js : on vérifie aussi que la session existe encore sur le serveur
  // (déconnexion ou jeton Pronote refusé), sinon /login et / se renverraient l'un à l'autre.
  return !!decoded && (await sessionExists(viewerIdOf(decoded.sid)));
}

// Première barrière : toute requête sans session valide est renvoyée vers /login
// (ou reçoit un 401 pour les routes API). Les pages et routes revérifient avec verifySession().
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = await isLoggedIn(request);

  let response: NextResponse;
  if (pathname === "/login" && loggedIn) {
    // Déjà connecté : on va directement à la page demandée (ou à l'Accueil).
    const next = safeNextPath(request.nextUrl.searchParams.get(NEXT_PARAM)) ?? "/";
    response = NextResponse.redirect(new URL(next, request.url));
  } else if (loggedIn || PUBLIC_PATHS.has(pathname)) {
    response = NextResponse.next();
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  } else {
    // On garde la page demandée (lien du widget, favori…) pour y revenir après la connexion.
    const login = new URL("/login", request.url);
    const next = safeNextPath(pathname + request.nextUrl.search);
    if (next) login.searchParams.set(NEXT_PARAM, next);
    response = NextResponse.redirect(login);
  }

  // Cookie présent mais invalide (expiré, falsifié, session supprimée) : on le retire.
  if (!loggedIn && request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Tout sauf les fichiers statiques de Next.js, les icônes et les thèmes d'exemple + leur guide (public/themes).
  matcher: ["/((?!_next/static|_next/image|icons/|themes/|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
