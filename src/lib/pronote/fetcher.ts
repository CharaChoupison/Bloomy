import "server-only";
import { defaultFetcher, getHeaderFromResponse, type Fetcher, type Request } from "@literate.ink/utilities";
import { assertPublicUrl } from "./network";

// Le serveur Pronote 2022 de l'école affiche sa version au format "PRONOTE 2022 - 0.4.0",
// alors que Pawnote attend "PRONOTE 2022.0.4.0" (sinon : PageUnavailableError à la connexion).
// On réécrit donc la réponse avant que Pawnote la lise.
const OLD_VERSION_FORMAT = />PRONOTE (\d+) - (\d+)\.(\d+)\.(\d+)/g;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

/**
 * Fetcher de Pawnote : vérifie que chaque requête (et chaque redirection, suivie à la main)
 * vise un serveur public, pour que Bloomy ne serve jamais de relais vers le réseau interne.
 */
export const pronoteFetcher: Fetcher = async (req) => {
  let current: Request = req;
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(current.url);
    const res = await defaultFetcher({ ...current, redirect: "manual" });
    const location = getHeaderFromResponse(res, "location");

    if (req.redirect === "manual" || !REDIRECTS.has(res.status) || !location) {
      if (res.content.includes(">PRONOTE ")) {
        return { ...res, content: res.content.replace(OLD_VERSION_FORMAT, ">PRONOTE $1.$2.$3.$4") };
      }
      return res;
    }
    if (hop >= MAX_REDIRECTS) throw new Error("Pronote : trop de redirections");

    // Même règle que les navigateurs : 303, et 301/302 après un POST, repartent en GET sans corps.
    const toGet = res.status === 303 || ((res.status === 301 || res.status === 302) && current.method === "POST");
    current = {
      ...current,
      url: new URL(location, current.url),
      ...(toGet ? { method: "GET", content: undefined } : {}),
    };
  }
};
