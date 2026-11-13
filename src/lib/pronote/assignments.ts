import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { AssignmentReturnKind, assignmentsFromIntervals } from "pawnote";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";
import { assignmentsTag, viewerTag } from "./cache-tags";
import { htmlToText } from "@/lib/html-to-text";
import { plainAttachments, type PlainAttachment } from "./attachments";

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
  /** Copie déposée par l'élève (lien Pronote), si elle existe. */
  uploadedFile?: AssignmentAttachment;
  /** Pronote accepte encore un dépôt (ou un retrait) de copie pour ce devoir. */
  canUpload: boolean;
  /** Taille maximale d'une copie pour cet élève, en octets (0 si inconnue). */
  uploadMaxBytes: number;
  /** 0 non précisée, 1 facile, 2 moyenne, 3 difficile. */
  difficulty: number;
  /** Durée estimée, en minutes. */
  length?: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Devoirs à rendre entre `fromKey` ("YYYY-MM-DD", inclus) et `daysAhead` jours plus tard
 * (4 semaines par défaut), triés par échéance.
 * Mis en cache quelques minutes ; vidé par l'action « fait » (tag assignmentsTag).
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getAssignments(fromKey: string, daysAhead = DAYS_AHEAD): Promise<AssignmentItem[]> {
  const viewer = await verifySession();
  return getAssignmentsFor(viewer.id, fromKey, daysAhead);
}

/** Comme getAssignments(), pour un élève déjà authentifié autrement (code d'accès du widget). */
export async function getAssignmentsFor(
  viewerId: string,
  fromKey: string,
  daysAhead = DAYS_AHEAD,
): Promise<AssignmentItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));
  cacheTag(assignmentsTag(viewerId));

  return loadAssignments(viewerId, fromKey, daysAhead);
}

/** Même chargement, sans cache : données à jour (vérification des notifications, voir lib/push). */
export async function loadAssignments(
  viewerId: string,
  fromKey: string,
  daysAhead = DAYS_AHEAD,
): Promise<AssignmentItem[]> {
  const [y, m, d] = fromKey.split("-").map(Number);
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d + daysAhead, 23, 59, 59, 999);

  const { raw, uploadMaxBytes } = await withPronote(viewerId, async (session) => ({
    raw: await assignmentsFromIntervals(session, from, to),
    uploadMaxBytes: session.user.authorizations.maxAssignmentFileUploadSize || 0,
  }));

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
      uploadedFile: a.return.uploaded ? plainAttachments([a.return.uploaded])[0] : undefined,
      canUpload: a.return.kind === AssignmentReturnKind.FileUpload && a.return.canUpload,
      uploadMaxBytes,
      difficulty: a.difficulty,
      length: a.length || undefined,
    }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.subject.localeCompare(b.subject, "fr"));
}
