import "server-only";
import { defaultFetcher, type Fetcher } from "@literate.ink/utilities";

// Le serveur Pronote 2022 de l'école affiche sa version au format "PRONOTE 2022 - 0.4.0",
// alors que Pawnote attend "PRONOTE 2022.0.4.0" (sinon : PageUnavailableError à la connexion).
// On réécrit donc la réponse avant que Pawnote la lise. Voir poc/pronote-fetcher.ts.
const OLD_VERSION_FORMAT = />PRONOTE (\d+) - (\d+)\.(\d+)\.(\d+)/g;

export const pronoteFetcher: Fetcher = async (req) => {
  const res = await defaultFetcher(req);
  if (res.content.includes(">PRONOTE ")) {
    return { ...res, content: res.content.replace(OLD_VERSION_FORMAT, ">PRONOTE $1.$2.$3.$4") };
  }
  return res;
};
