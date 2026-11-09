import "server-only";

// Vérification périodique : pour chaque session abonnée, on relit Pronote (sans cache), on compare
// à l'instantané précédent et on envoie les notifications. Lancée par /api/push/tick (voir instrumentation.ts).

import { rememberKey } from "@/lib/auth/keyring";
import { storedSessionExpiry } from "@/lib/auth/session-store";
import { formatPoints } from "@/lib/grades-format";
import { loadAssignments } from "@/lib/pronote/assignments";
import { loadGrades } from "@/lib/pronote/grades";
import { loadWeekTimetable, mondayKey, toDateKey } from "@/lib/pronote/timetable";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";
import { computeChanges, type CheckInput, type PushMessage } from "./changes";
import {
  deletePushSubscription,
  getPushRecord,
  getVapidKeys,
  listPushViewers,
  openPushSessionKey,
  updatePushRecord,
} from "./store";
import { sendPush } from "./web-push";

/** Pas de notification la nuit : on ne vérifie pas entre 22 h et 7 h (heure de l'établissement). */
const QUIET = { from: 22, to: 7 };
const MAX_FAILURES = 10;
const expiryFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: SCHOOL_TIME_ZONE });

const hourFmt = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: SCHOOL_TIME_ZONE });
export const isQuietHour = (now = new Date()) => {
  const h = Number(hourFmt.format(now));
  return h >= QUIET.from || h < QUIET.to;
};

/** Données Pronote utiles aux notifications, lues sans cache. */
async function collect(viewerId: string): Promise<CheckInput> {
  const now = Date.now();
  const todayKey = toDateKey(new Date(now));
  const [grades, assignments, thisWeek, nextWeek] = await Promise.all([
    loadGrades(viewerId),
    loadAssignments(viewerId, todayKey, 21),
    loadWeekTimetable(viewerId, mondayKey(0)),
    loadWeekTimetable(viewerId, mondayKey(1)),
  ]);
  const classes = [thisWeek, nextWeek].flatMap((week, weekOffset) =>
    week.days.flatMap((day) =>
      day.classes
        .filter((c) => Date.parse(c.start) > now)
        .map((c) => ({
          id: c.id,
          title: c.title,
          start: c.start,
          dateKey: day.date,
          weekOffset,
          canceled: c.canceled,
          status: c.status,
        })),
    ),
  );
  return {
    todayKey,
    grades: grades.grades.map((g) => {
      const points = formatPoints(g.value);
      const max = formatPoints(g.outOf);
      return { id: g.id, subject: g.subject, value: points ? `${points}/${max ?? "20"}` : undefined };
    }),
    assignments: assignments.map((a) => ({ id: a.id, subject: a.subject, deadlineKey: a.deadlineKey, done: a.done })),
    classes,
  };
}

async function notify(viewerId: string, messages: PushMessage[]): Promise<"ok" | "gone"> {
  const record = await getPushRecord(viewerId);
  const keys = await getVapidKeys();
  if (!record || !keys) return "ok";
  let failures = record.failures ?? 0;
  for (const message of messages) {
    const result = await sendPush(record.subscription, message, keys);
    if (result === "gone") {
      await deletePushSubscription(viewerId);
      return "gone";
    }
    failures = result === "sent" ? 0 : failures + 1;
  }
  if (failures >= MAX_FAILURES) {
    await deletePushSubscription(viewerId);
    return "gone";
  }
  if (failures !== (record.failures ?? 0)) await updatePushRecord(viewerId, { failures });
  return "ok";
}

/** Vérifie une session ; renvoie le nombre de notifications envoyées. */
export async function checkViewer(viewerId: string): Promise<number> {
  const record = await getPushRecord(viewerId);
  const sessionKey = await openPushSessionKey(viewerId);
  const expiresAt = await storedSessionExpiry(viewerId);
  if (!record || !sessionKey || !expiresAt) {
    await deletePushSubscription(viewerId);
    return 0;
  }

  // Le client Pronote reprend la clé dans le trousseau en mémoire, comme pour une page ou le widget.
  rememberKey(viewerId, sessionKey);
  let input: CheckInput;
  try {
    input = await collect(viewerId);
  } catch (error) {
    if ((error as Error).name === "PronoteSessionLostError") {
      // La session n'existe plus : dernier message pour que l'élève sache pourquoi tout s'arrête.
      await notify(viewerId, [
        {
          title: "Notifications en pause",
          body: "Ta session Pronote a expiré. Reconnecte-toi à Bloomy pour les réactiver.",
          url: "/login",
          tag: "session",
        },
      ]);
      await deletePushSubscription(viewerId);
      return 0;
    }
    console.warn("[push] Pronote indisponible pour une session :", (error as Error).message);
    return 0;
  }

  const { messages, snapshot } = computeChanges(record.snapshot ?? null, input, record.prefs);

  // Session qui expire dans moins de 2 jours : on prévient une fois.
  let expiryWarnedFor = record.expiryWarnedFor;
  if (expiresAt - Date.now() < 2 * 24 * 3600 * 1000 && expiryWarnedFor !== expiresAt) {
    messages.push({
      title: "Ta session Bloomy expire bientôt",
      body: `Reconnecte-toi avant le ${expiryFmt.format(new Date(expiresAt))} pour garder les notifications.`,
      url: "/reglages",
      tag: "session",
    });
    expiryWarnedFor = expiresAt;
  }

  await updatePushRecord(viewerId, { snapshot, lastCheckAt: Date.now(), expiryWarnedFor });
  if (messages.length === 0) return 0;
  return (await notify(viewerId, messages)) === "gone" ? 0 : messages.length;
}

let running = false;

/** Un passage sur toutes les sessions abonnées, l'une après l'autre (on ménage Pronote). */
export async function checkAll({ force = false } = {}): Promise<{ checked: number; sent: number; skipped?: string }> {
  if (running) return { checked: 0, sent: 0, skipped: "déjà en cours" };
  if (!force && isQuietHour()) return { checked: 0, sent: 0, skipped: "nuit" };
  running = true;
  let checked = 0;
  let sent = 0;
  try {
    for (const viewerId of await listPushViewers()) {
      try {
        sent += await checkViewer(viewerId);
        checked++;
      } catch (error) {
        console.error("[push] vérification impossible", error);
      }
    }
  } finally {
    running = false;
  }
  return { checked, sent };
}
