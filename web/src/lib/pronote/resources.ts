import "server-only";
import { cacheLife } from "next/cache";
import { resourcesFromIntervals } from "pawnote";
import { withPronote } from "./client";
import { htmlToText } from "@/lib/html-to-text";
import { lessonAnchor } from "@/lib/lesson-anchor";
import { plainAttachments, type PlainAttachment } from "./attachments";

export type LessonFile = PlainAttachment;

export type LessonContent = {
  id: string;
  /** "Cours", "TD", "Correction"… (vide si non précisé). */
  category: string;
  title: string;
  /** Texte brut (le HTML de Pronote est converti côté serveur). */
  text: string;
  files: LessonFile[];
};

export type LessonSession = {
  id: string;
  /** Ancre partagée avec l'emploi du temps (lien « Contenu du cours »). */
  anchor: string;
  start: string; // ISO
  end: string; // ISO
  dateKey: string; // "YYYY-MM-DD"
  subject: string;
  color?: string;
  teachers: string[];
  hasAssignment: boolean;
  contents: LessonContent[];
};

const CATEGORY_LABELS: Record<number, string> = {
  1: "Cours",
  2: "Correction",
  3: "Devoir sur table",
  4: "Interrogation orale",
  5: "TD",
  6: "TP",
  7: "Évaluation de compétences",
  8: "EPI",
  9: "AP",
  12: "Visio",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Ancres des séances d'une semaine qui ont un contenu, pour les liens depuis l'emploi du temps.
 * Ne bloque jamais l'affichage : en cas d'erreur, simplement aucun lien.
 */
export async function getContentAnchors(weekStart: string): Promise<Set<string>> {
  try {
    return new Set((await getLessonContents(weekStart)).map((s) => s.anchor));
  } catch (error) {
    console.error("[pronote] contenus de cours", error);
    return new Set();
  }
}

/**
 * Contenus de cours d'une semaine (à partir de son lundi "YYYY-MM-DD"), du plus récent au plus ancien.
 * Seules les séances qui ont un contenu sont gardées. Mis en cache quelques minutes.
 * ⚠️ Pas de vérification d'accès ici : à appeler uniquement après `verifySession()`.
 */
export async function getLessonContents(weekStart: string): Promise<LessonSession[]> {
  "use cache";
  cacheLife("minutes");

  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y, m - 1, d, 0, 0, 0, 0);
  const sunday = new Date(y, m - 1, d + 6, 23, 59, 59, 999);

  const raw = await withPronote((session) => resourcesFromIntervals(session, monday, sunday));

  return raw
    .map((r) => ({
      id: r.id,
      anchor: lessonAnchor(r.startDate.toISOString()),
      start: r.startDate.toISOString(),
      end: r.endDate.toISOString(),
      dateKey: toKey(r.startDate),
      subject: r.subject.name,
      color: r.backgroundColor || undefined,
      teachers: r.teachers,
      hasAssignment: r.haveAssignment,
      contents: r.contents
        .map((c) => ({
          id: c.id,
          category: CATEGORY_LABELS[c.category] ?? c.categoryText?.trim() ?? "",
          title: c.title?.trim() ?? "",
          text: c.description ? htmlToText(c.description) : "",
          files: plainAttachments(c.files),
        }))
        .filter((c) => c.title || c.text || c.files.length > 0),
    }))
    .filter((s) => s.contents.length > 0)
    .sort((a, b) => b.start.localeCompare(a.start));
}
