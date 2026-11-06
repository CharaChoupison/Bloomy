import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { assignmentsFromIntervals } from "pawnote";
import { withPronote } from "./client";
import { htmlToText } from "@/lib/html-to-text";
import { plainAttachments, type PlainAttachment } from "./attachments";

export const ASSIGNMENTS_TAG = "assignments";
const DAYS_AHEAD = 28;

export type AssignmentAttachment = PlainAttachment;

export type AssignmentItem = {
  id: string;
  subjectId: string;
  subject: string;
  color?: string;
  /** Consigne en texte brut (le HTML de Pronote est converti côté serveur). */
  description: string;
  deadline: string; // ISO
  deadlineKey: string; // "YYYY-MM-DD" (heure locale du serveur)
  done: boolean;
  attachments: AssignmentAttachment[];
  /** 0 aucun, 1 papier, 2 dépôt de fichier, 3 kiosque, 4 enregistrement audio. */
  returnKind: number;
  hasUploadedFile: boolean;
  /** 0 non précisée, 1 facile, 2 moyenne, 3 difficile. */
  difficulty: number;
  /** Durée estimée, en minutes. */
  length?: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Devoirs à rendre entre `fromKey` ("YYYY-MM-DD", inclus) et les 4 semaines suivantes, triés par échéance.
 * Mis en cache quelques minutes ; vidé par l'action « fait » (tag ASSIGNMENTS_TAG).
 * ⚠️ Pas de vérification d'accès ici : à appeler uniquement après `verifySession()`.
 */
export async function getAssignments(fromKey: string): Promise<AssignmentItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ASSIGNMENTS_TAG);

  const [y, m, d] = fromKey.split("-").map(Number);
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d + DAYS_AHEAD, 23, 59, 59, 999);

  const raw = await withPronote((session) => assignmentsFromIntervals(session, from, to));

  return raw
    .filter((a) => a.deadline >= from)
    .map((a) => ({
      id: a.id,
      subjectId: a.subject.id,
      subject: a.subject.name,
      color: a.backgroundColor || undefined,
      description: htmlToText(a.description),
      deadline: a.deadline.toISOString(),
      deadlineKey: toKey(a.deadline),
      done: a.done,
      attachments: plainAttachments(a.attachments),
      returnKind: a.return.kind,
      hasUploadedFile: !!a.return.uploaded,
      difficulty: a.difficulty,
      length: a.length || undefined,
    }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.subject.localeCompare(b.subject, "fr"));
}
