"use server";

import { cookies } from "next/headers";
import { recallKey } from "@/lib/auth/keyring";
import { getViewer } from "@/lib/auth/session";
import { createWidgetAccess, deleteWidgetAccess } from "@/lib/auth/widget-store";
import { ACCENT_COOKIE, DEFAULT_ACCENT, isAccent } from "@/lib/preferences";

export type CreateWidgetResult = { ok: true; code: string } | { ok: false; error: string };

const EXPIRED = "Ta session a expiré. Reconnecte-toi.";

/** Crée le code d'accès du widget (remplace l'ancien). Le code n'est renvoyé qu'ici, jamais réaffiché. */
export async function createWidgetCode(): Promise<CreateWidgetResult> {
  const viewer = await getViewer(); // dépose aussi la clé de session dans le trousseau
  const key = viewer && recallKey(viewer.id);
  if (!viewer || !key) return { ok: false, error: EXPIRED };

  const accent = (await cookies()).get(ACCENT_COOKIE)?.value;
  try {
    const code = await createWidgetAccess(viewer.id, key, isAccent(accent) ? accent : DEFAULT_ACCENT);
    return { ok: true, code };
  } catch (error) {
    console.error("[widget] création", error);
    return { ok: false, error: "Impossible de créer le code. Réessaie dans un instant." };
  }
}

export async function disableWidget(): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: EXPIRED };
  await deleteWidgetAccess(viewer.id);
  return { ok: true };
}
