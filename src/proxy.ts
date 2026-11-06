import { NextResponse, type NextRequest } from "next/server";
import { sessionExists } from "@/lib/auth/session-store";
import { decodeSessionCookie, SESSION_COOKIE, viewerIdOf } from "@/lib/auth/token";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = new Set(["/login", "/confidentialite"]);

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
    response = NextResponse.redirect(new URL("/", request.url));
  } else if (loggedIn || PUBLIC_PATHS.has(pathname)) {
    response = NextResponse.next();
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  } else {
    response = NextResponse.redirect(new URL("/login", request.url));
  }

  // Cookie présent mais invalide (expiré, falsifié, session supprimée) : on le retire.
  if (!loggedIn && request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Tout sauf les fichiers statiques de Next.js, les icônes et les thèmes d'exemple + leur guide (public/themes).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|themes/|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
