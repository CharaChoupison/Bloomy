import "server-only";
import { addDays, formatShortDate } from "@/lib/format";
import { lessonContentHref } from "@/lib/lesson-anchor";
import type { PlainAttachment } from "./attachments";
import { getAssignments } from "./assignments";
import { getLessonContentsBetween } from "./resources";

// « Ressources » : tous les fichiers et liens déposés par les profs, rassemblés depuis
// le contenu des cours (sur une période) et les devoirs à venir.

export type ResourceItem = {
  /** Clé stable (URL du fichier + origine). */
  key: string;
  file: PlainAttachment;
  subject: string;
  color?: string;
  /** Date de la séance, ou échéance du devoir (ISO). */
  date: string;
  origin: "cours" | "devoir";
  /** "TD · Intégrales", "Devoir pour le 12 nov."… */
  context: string;
  /** Écran d'où vient le fichier. */
  sourceHref: string;
};

export type ResourceLibrary = {
  items: ResourceItem[];
  /** Matières présentes, triées, avec leur nombre de fichiers. */
  subjects: { name: string; count: number }[];
};

/**
 * Fichiers des `weeks` dernières semaines de cours (jusqu'à aujourd'hui) et des devoirs à venir,
 * du plus récent au plus ancien (les devoirs, à venir, arrivent donc en tête).
 * Les deux sources sont lues en parallèle ; une erreur sur l'une fait échouer l'ensemble.
 * ⚠️ Pas de vérification d'accès ici : à appeler uniquement après `verifySession()`.
 */
export async function getResourceLibrary(todayKey: string, weeks: number): Promise<ResourceLibrary> {
  const [sessions, assignments] = await Promise.all([
    getLessonContentsBetween(addDays(todayKey, -7 * weeks + 1), todayKey),
    getAssignments(todayKey),
  ]);

  const items: ResourceItem[] = [];
  const seen = new Set<string>();
  const push = (item: ResourceItem) => {
    if (seen.has(item.file.url)) return; // même fichier déposé deux fois : on le garde une seule fois
    seen.add(item.file.url);
    items.push(item);
  };

  for (const a of assignments) {
    for (const file of a.attachments) {
      push({
        key: `devoir-${a.id}-${file.url}`,
        file,
        subject: a.subject,
        color: a.color,
        date: a.deadline,
        origin: "devoir",
        context: `Devoir pour le ${formatShortDate(a.deadline)}`,
        sourceHref: "/devoirs",
      });
    }
  }

  for (const s of sessions) {
    for (const c of s.contents) {
      for (const file of c.files) {
        push({
          key: `cours-${c.id}-${file.url}`,
          file,
          subject: s.subject,
          color: s.color,
          date: s.start,
          origin: "cours",
          context: [c.category, c.title].filter(Boolean).join(" · ") || "Contenu du cours",
          sourceHref: lessonContentHref(s.dateKey, s.start),
        });
      }
    }
  }

  items.sort((a, b) => b.date.localeCompare(a.date));

  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.subject, (counts.get(i.subject) ?? 0) + 1);
  const subjects = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return { items, subjects };
}
