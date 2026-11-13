"use server";

import { updateTag } from "next/cache";
import { assignmentRemoveFile, assignmentStatus, assignmentUploadFile } from "pawnote";
import { getViewer } from "@/lib/auth/session";
import { withPronote } from "@/lib/pronote/client";
import { assignmentsTag } from "@/lib/pronote/cache-tags";
import { cleanFileName, isUploadFixApplied } from "@/lib/pronote/homework-upload";
import { formatFileSize } from "@/lib/format";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SetDoneResult = ActionResult;

/**
 * Coche / décoche un devoir dans Pronote (avec le dépôt de copie, seules écritures de Bloomy dans Pronote).
 * Une server action est un point d'entrée public : on revérifie la session et on valide l'entrée.
 */
export async function setAssignmentDone(id: unknown, done: unknown): Promise<SetDoneResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (typeof id !== "string" || id.length === 0 || id.length > 200 || typeof done !== "boolean") {
    return { ok: false, error: "Demande invalide." };
  }

  try {
    await withPronote(viewer.id, (session) => assignmentStatus(session, id, done));
  } catch (error) {
    console.error("[pronote] assignmentStatus", error);
    return { ok: false, error: "Impossible d'enregistrer dans Pronote. Réessaie dans un instant." };
  }

  updateTag(assignmentsTag(viewer.id)); // la liste de cet élève se recharge avec l'état enregistré dans Pronote
  return { ok: true };
}

const isValidId = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 200;

/**
 * Dépose la copie de l'élève sur un devoir « à déposer en ligne ».
 * Reçoit un FormData { id, file } (envoyé depuis un <input type="file">).
 * La taille maximale vient de Pronote ; Pawnote la revérifie aussi.
 */
export async function uploadAssignmentFile(form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };

  const id = form.get("id");
  const file = form.get("file");
  if (!isValidId(id) || !(file instanceof File)) return { ok: false, error: "Demande invalide." };
  if (file.size === 0) return { ok: false, error: "Ce fichier est vide. Choisis-en un autre." };

  if (!(await isUploadFixApplied())) {
    console.error("[pronote] Dépôt refusé : correctif Pawnote absent (lance `npm run postinstall`).");
    return { ok: false, error: "Le dépôt de copie n'est pas disponible pour le moment. Dépose-la depuis Pronote." };
  }

  try {
    await withPronote(viewer.id, (session) => assignmentUploadFile(session, id, file, cleanFileName(file.name)));
  } catch (error) {
    const name = (error as Error).name;
    if (name === "UploadSizeError") {
      const max = (error as { message: string }).message.match(/\d+/)?.[0];
      return {
        ok: false,
        error: max ? `Fichier trop lourd : ${formatFileSize(Number(max))} maximum.` : "Fichier trop lourd pour Pronote.",
      };
    }
    console.error("[pronote] assignmentUploadFile", error);
    return { ok: false, error: "Pronote n'a pas accepté la copie. Réessaie dans un instant." };
  }

  updateTag(assignmentsTag(viewer.id));
  return { ok: true };
}

/** Retire la copie déposée (pour en déposer une autre, tant que Pronote l'autorise). */
export async function removeAssignmentFile(id: unknown): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (!isValidId(id)) return { ok: false, error: "Demande invalide." };

  try {
    await withPronote(viewer.id, (session) => assignmentRemoveFile(session, id));
  } catch (error) {
    console.error("[pronote] assignmentRemoveFile", error);
    return { ok: false, error: "Impossible de retirer la copie. Réessaie dans un instant." };
  }

  updateTag(assignmentsTag(viewer.id));
  return { ok: true };
}
