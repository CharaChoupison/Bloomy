import "server-only";
import { addDays, formatShortDate } from "@/lib/format";
import { lessonContentHref } from "@/lib/lesson-anchor";
import type { PlainAttachment } from "./attachments";
import { getAssignments } from "./assignments";
import { getCourseDataBetween } from "./resources";

// « Ressources » : tous les fichiers et liens déposés par les profs, rassemblés depuis
// le contenu des cours et les « autres documents » (sur une période), et les devoirs à venir.

export type ResourceItem = {
  /** Clé stable (URL du fichier + origine). */
  key: string;
  file: PlainAttachment;
  subject: string;
  color?: string;
  /** Date de la séance, échéance du devoir ou date de dépôt (ISO). */
  date: string;
  /** « document » : déposé dans les ressources de la matière, sans séance ni devoir. */
  origin: "cours" | "devoir" | "document";
  /** Lien vers l'écran d'où vient le fichier ("TD · Intégrales", "Devoir pour le 12 nov."…). */
  source?: { label: string; href: string };
};

export type ResourceLibrary = {
  items: ResourceItem[];
  /** Matières présentes, triées, avec leur nombre de fichiers. */
  subjects: { name: string; count: number }[];
};

/**
 * Les profs déposent souvent leurs fichiers sur des séances à venir (Pronote les montre déjà
 * dans « Dernières ressources pédagogiques ») : on lit donc aussi les prochaines semaines.
 * Une seule requête Pronote couvre tout l'intervalle, l'élargir ne coûte rien de plus.
 */
export const UPCOMING_WEEKS = 4;

/**
 * Fichiers des `weeks` dernières semaines de cours, des `UPCOMING_WEEKS` prochaines et des devoirs
 * à venir, du plus récent au plus ancien (ce qui est à venir arrive donc en tête).
 * Les deux sources sont lues en parallèle ; une erreur sur l'une fait échouer l'ensemble.
 */
export async function getResourceLibrary(todayKey: string, weeks: number): Promise<ResourceLibrary> {
  const [{ sessions, documents }, assignments] = await Promise.all([
    getCourseDataBetween(addDays(todayKey, -7 * weeks + 1), addDays(todayKey, 7 * UPCOMING_WEEKS)),
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
        source: { label: `Devoir pour le ${formatShortDate(a.deadline)}`, href: "/devoirs" },
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
          source: {
            label: [c.category, c.title].filter(Boolean).join(" · ") || "Contenu du cours",
            href: lessonContentHref(s.dateKey, s.start),
          },
        });
      }
    }
  }

  for (const d of documents) {
    push({ key: `document-${d.id}`, file: d.file, subject: d.subject, date: d.date, origin: "document" });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));

  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.subject, (counts.get(i.subject) ?? 0) + 1);
  const subjects = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return { items, subjects };
}
