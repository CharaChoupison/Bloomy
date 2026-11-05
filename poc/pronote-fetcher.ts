// Fetcher personnalisé pour Pawnote, adapté au serveur Pronote 2022 de l'école.
//
// Problème : sur la page de connexion, Pawnote cherche la version avec la regex
//   />PRONOTE (\d+\.\d+\.\d+)/   (format récent : "PRONOTE 2024.3.10")
// mais ce serveur affiche l'ancien format "PRONOTE 2022 - 0.4.0" → Pawnote lève PageUnavailableError.
//
// Solution : on laisse le fetcher par défaut faire la requête, puis on réécrit
// "PRONOTE 2022 - 0.4.0" en "PRONOTE 2022.0.4.0" dans la réponse avant que Pawnote la lise.
import { defaultFetcher, type Fetcher } from "@literate.ink/utilities";

const OLD_VERSION_FORMAT = />PRONOTE (\d+) - (\d+)\.(\d+)\.(\d+)/g;

export const pronoteFetcher: Fetcher = async (req) => {
  const res = await defaultFetcher(req);
  if (res.content.includes(">PRONOTE ")) {
    return { ...res, content: res.content.replace(OLD_VERSION_FORMAT, ">PRONOTE $1.$2.$3.$4") };
  }
  return res;
};
