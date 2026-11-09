"use server";

import { updateTag } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { viewerTag } from "@/lib/pronote/cache-tags";

export type RefreshResult = { ok: true } | { ok: false; error: string };

// Chaque actualisation refait les appels Pronote de l'écran : on borne la cadence par élève
// pour ne pas solliciter Pronote (ni risquer d'invalider le jeton) sur des appuis répétés.
const limiter = new RateLimiter(60_000, 6);

/**
 * Vide les caches Pronote de l'élève connecté (emploi du temps, notes, devoirs…).
 * `updateTag` dans une server action recharge aussi l'écran en cours avec les données fraîches,
 * dans la même réponse.
 */
export async function refreshPronoteData(): Promise<RefreshResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };

  if (limiter.isLimited(viewer.id)) {
    return { ok: false, error: "Patiente un instant avant d'actualiser à nouveau." };
  }
  limiter.record(viewer.id);

  updateTag(viewerTag(viewer.id));
  return { ok: true };
}
