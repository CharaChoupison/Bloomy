import type { NextRequest } from "next/server";
import { rememberKey } from "@/lib/auth/keyring";
import { clientIp, RateLimiter } from "@/lib/auth/rate-limit";
import { openWidgetAccess } from "@/lib/auth/widget-store";
import { getWidgetData } from "@/lib/widget/data";

// GET /api/widget — données du widget d'écran d'accueil (voir lib/widget/data.ts).
// Pas de cookie ici : le script envoie son code d'accès dans « Authorization: Bearer pw1.… »
// (jamais dans l'URL, qui finit dans les journaux). proxy.ts laisse passer cette route sans session.

// Codes refusés par IP : empêche d'essayer des codes en rafale.
const failuresByIp = new RateLimiter(15 * 60 * 1000, 20);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: NextRequest) {
  const ip = await clientIp();
  if (failuresByIp.isLimited(ip)) {
    return json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, 429);
  }

  const code = request.headers.get("authorization")?.match(/^Bearer (\S{1,200})$/)?.[1];
  const access = code ? await openWidgetAccess(code) : null;
  if (!access) {
    failuresByIp.record(ip);
    return json({ error: "Code d'accès invalide ou désactivé. Crée-en un nouveau dans Bloomy › Réglages › Widget." }, 401);
  }

  // Le client Pronote reprend la clé de session dans le trousseau en mémoire, comme pour une page.
  rememberKey(access.viewerId, access.sessionKey);
  try {
    return json(await getWidgetData(access.viewerId, access.accent));
  } catch (error) {
    if ((error as Error).name === "PronoteSessionLostError") {
      return json({ error: "Session Pronote expirée. Reconnecte-toi dans Bloomy, puis crée un nouveau code." }, 401);
    }
    console.error("[widget]", error);
    return json({ error: "Pronote est indisponible pour le moment." }, 502);
  }
}
