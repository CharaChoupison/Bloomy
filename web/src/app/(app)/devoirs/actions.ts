"use server";

import { updateTag } from "next/cache";
import { assignmentStatus } from "pawnote";
import { hasValidSession } from "@/lib/auth/session";
import { withPronote } from "@/lib/pronote/client";
import { ASSIGNMENTS_TAG } from "@/lib/pronote/assignments";

export type SetDoneResult = { ok: true } | { ok: false; error: string };

/**
 * Coche / décoche un devoir dans Pronote (seule écriture que Pronoti fait dans Pronote).
 * Une server action est un point d'entrée public : on revérifie la session et on valide l'entrée.
 */
export async function setAssignmentDone(id: unknown, done: unknown): Promise<SetDoneResult> {
  if (!(await hasValidSession())) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (typeof id !== "string" || id.length === 0 || id.length > 200 || typeof done !== "boolean") {
    return { ok: false, error: "Demande invalide." };
  }

  try {
    await withPronote((session) => assignmentStatus(session, id, done));
  } catch (error) {
    console.error("[pronote] assignmentStatus", error);
    return { ok: false, error: "Impossible d'enregistrer dans Pronote. Réessaie dans un instant." };
  }

  updateTag(ASSIGNMENTS_TAG); // la liste se recharge avec l'état enregistré dans Pronote
  return { ok: true };
}
