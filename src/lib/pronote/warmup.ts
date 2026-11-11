import "server-only";
import { after } from "next/server";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { addDays } from "@/lib/format";
import { OVERDUE_DAYS, UPCOMING_DAYS } from "@/lib/assignments-view";
import { getAssignmentsFor } from "./assignments";
import { getNotebookFor } from "./notebook";
import { getLessonContentsBetweenFor } from "./resources";
import { getWeekTimetableFor, mondayKey, toDateKey } from "./timetable";

// Préchauffage : une fois l'accueil envoyé, on remplit le cache des écrans voisins,
// pour qu'ils s'ouvrent tout de suite au lieu d'attendre Pronote.
//
// - Les arguments sont exactement ceux des écrans, sinon la clé de cache diffère et le travail est perdu.
// - On ne précharge pas ce que l'accueil charge déjà (notes, messagerie, actualités, semaine en cours).
// - Les appels passent un par un, après la réponse : ils ne ralentissent ni l'affichage, ni la session Pronote.
// - Une fois par élève toutes les 5 minutes au plus (durée de fraîcheur de cacheLife("minutes")) :
//   revenir sur l'accueil ne relance pas une série d'appels à chaque fois.
const limiter = new RateLimiter(5 * 60_000, 1);

/** Tâches de préchauffage, dans l'ordre de probabilité d'ouverture depuis l'accueil. */
function tasks(viewerId: string): Array<() => Promise<unknown>> {
  const todayKey = toDateKey(new Date());
  const thisWeek = mondayKey(0);
  const nextWeek = mondayKey(1);
  return [
    // Devoirs : liste complète, avec les retards (voir devoirs/page.tsx).
    () => getAssignmentsFor(viewerId, addDays(todayKey, -OVERDUE_DAYS), OVERDUE_DAYS + UPCOMING_DAYS),
    // Calendrier : liens « Contenu du cours » de la semaine, puis la semaine suivante (balayage).
    () => getLessonContentsBetweenFor(viewerId, thisWeek, addDays(thisWeek, 6)),
    () => getWeekTimetableFor(viewerId, nextWeek),
    () => getLessonContentsBetweenFor(viewerId, nextWeek, addDays(nextWeek, 6)),
    // Vie scolaire : période par défaut.
    () => getNotebookFor(viewerId),
  ];
}

/**
 * Programme le préchauffage pour après l'envoi de la réponse.
 * À appeler depuis un composant serveur, avec l'identifiant d'un élève déjà vérifié.
 */
export function warmUpScreens(viewerId: string): void {
  if (limiter.isLimited(viewerId)) return;
  limiter.record(viewerId);

  after(async () => {
    for (const run of tasks(viewerId)) {
      try {
        await run();
      } catch (error) {
        // Sans gravité : l'écran rechargera lui-même. Une session perdue fera échouer la suite, on s'arrête.
        console.warn("[pronote] préchauffage interrompu", (error as Error)?.name ?? error);
        return;
      }
    }
  });
}
