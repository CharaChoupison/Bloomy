import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth/token";

// Première barrière : toute requête sans cookie de session valide est renvoyée vers /login
// (ou reçoit un 401 pour les routes API). Les pages et routes revérifient avec verifySession().
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (loggedIn) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Tout sauf les fichiers statiques de Next.js et les icônes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
