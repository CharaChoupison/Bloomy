"use server";

import { getViewer } from "@/lib/auth/session";
import { recallKey } from "@/lib/auth/keyring";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { parsePrefs } from "@/lib/push/changes";
import { checkViewer } from "@/lib/push/check";
import {
  deletePushSubscription,
  getPushRecord,
  getVapidKeys,
  savePushSubscription,
  updatePushRecord,
} from "@/lib/push/store";
import { parseSubscription, sendPush } from "@/lib/push/web-push";
import { siteOrigin } from "@/lib/site-origin";

export type PushActionResult = { ok: true } | { ok: false; error: string };

const EXPIRED: PushActionResult = { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
const tests = new RateLimiter(60_000, 3);

/** Active les notifications sur cet appareil (abonnement créé par le navigateur). */
export async function enableNotifications(subscription: unknown, prefs: unknown): Promise<PushActionResult> {
  const viewer = await getViewer();
  const key = viewer && recallKey(viewer.id);
  if (!viewer || !key) return EXPIRED;
  const sub = parseSubscription(subscription);
  if (!sub) return { ok: false, error: "Ce navigateur a renvoyé un abonnement inattendu." };
  await getVapidKeys(await siteOrigin());
  await savePushSubscription(viewer.id, key, sub, parsePrefs(prefs));
  // Premier instantané tout de suite : les notifications portent ensuite sur ce qui change.
  checkViewer(viewer.id).catch((error) => console.warn("[push] premier instantané impossible", error));
  return { ok: true };
}

export async function updateNotificationPrefs(prefs: unknown): Promise<PushActionResult> {
  const viewer = await getViewer();
  if (!viewer) return EXPIRED;
  if (!(await getPushRecord(viewer.id))) return { ok: false, error: "Les notifications ne sont pas activées." };
  await updatePushRecord(viewer.id, { prefs: parsePrefs(prefs) });
  return { ok: true };
}

export async function disableNotifications(): Promise<PushActionResult> {
  const viewer = await getViewer();
  if (!viewer) return EXPIRED;
  await deletePushSubscription(viewer.id);
  return { ok: true };
}

/** Envoie une notification d'essai sur cet appareil. */
export async function sendTestNotification(): Promise<PushActionResult> {
  const viewer = await getViewer();
  if (!viewer) return EXPIRED;
  if (tests.isLimited(viewer.id)) return { ok: false, error: "Patiente un instant avant un nouvel essai." };
  tests.record(viewer.id);
  const [record, keys] = await Promise.all([getPushRecord(viewer.id), getVapidKeys()]);
  if (!record || !keys) return { ok: false, error: "Les notifications ne sont pas activées." };
  const result = await sendPush(
    record.subscription,
    { title: "Bloomy", body: "Les notifications fonctionnent sur cet appareil.", url: "/reglages/notifications", tag: "test" },
    keys,
    { urgency: "high", ttlSeconds: 300 },
  );
  if (result === "gone") {
    await deletePushSubscription(viewer.id);
    return { ok: false, error: "Cet appareil n'accepte plus les notifications. Réactive-les." };
  }
  return result === "sent" ? { ok: true } : { ok: false, error: "Le service de notifications n'a pas répondu. Réessaie plus tard." };
}

/** Clé publique du serveur pour s'abonner (onboarding : la page ne la reçoit pas au rendu). */
export async function getPushPublicKey(): Promise<string | null> {
  if (!(await getViewer())) return null;
  return (await getVapidKeys(await siteOrigin()))?.publicKey ?? null;
}
