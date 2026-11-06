import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notebook, TabLocation } from "pawnote";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";
import { viewerTag } from "./cache-tags";

// Vie scolaire, en lecture seule. Objets plats et sérialisables.
// ⚠️ Nécessite le correctif scripts/patch-pawnote.mjs (motif vide → plantage dans Pawnote 1.6.2).

export type NotebookPeriod = { id: string; name: string };

export type AbsenceItem = {
  id: string;
  start: string;
  end: string;
  /** Durée lisible : "2 h 30", "1 jour"… */
  duration: string;
  justified: boolean;
  toJustify: boolean;
  reason?: string;
};

export type DelayItem = { id: string; date: string; minutes: number; justified: boolean; toJustify: boolean; reason?: string };

export type PunishmentItem = {
  id: string;
  title: string;
  date: string;
  giver: string;
  reasons: string[];
  workToDo: string;
  durationMinutes: number;
  exclusion: boolean;
};

export type ObservationItem = {
  id: string;
  date: string;
  /** 0 défaut de carnet, 1 observation, 2 encouragement, 3 autre. */
  kind: number;
  name: string;
  subject?: string;
  comment?: string;
};

export type MeasureItem = { id: string; title: string; start: string; end: string; reasons: string[] };

export type NotebookView = {
  periods: NotebookPeriod[];
  period: NotebookPeriod;
  absences: AbsenceItem[];
  delays: DelayItem[];
  punishments: PunishmentItem[];
  observations: ObservationItem[];
  measures: MeasureItem[];
  totals: { absenceHours: number; absenceMinutes: number; absenceDays: number; delayMinutes: number };
};

/**
 * Durée d'une absence. Pronote renvoie à la fois les « jours concernés » et les heures manquées
 * (une absence de 2 h compte pour 1 jour) : on privilégie les heures, plus parlantes.
 */
export function formatDuration(days: number, hours: number, minutes: number): string {
  if (hours > 0) return `${hours} h${minutes ? ` ${String(minutes).padStart(2, "0")}` : ""}`;
  if (minutes > 0) return `${minutes} min`;
  if (days > 0) return `${days} jour${days > 1 ? "s" : ""}`;
  return "—";
}

const newestFirst = <T extends { date?: string; start?: string }>(a: T, b: T) =>
  (b.date ?? b.start ?? "").localeCompare(a.date ?? a.start ?? "");

/**
 * Vie scolaire d'une période (par défaut : la période courante selon Pronote).
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getNotebook(periodId?: string): Promise<NotebookView> {
  const viewer = await verifySession();
  return getNotebookFor(viewer.id, periodId);
}

async function getNotebookFor(viewerId: string, periodId?: string): Promise<NotebookView> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));

  return withPronote(viewerId, async (session) => {
    const tab = session.userResource.tabs.get(TabLocation.Notebook);
    const periods = tab?.periods.length ? tab.periods : session.instance.periods;
    const period = periods.find((p) => p.id === periodId) ?? tab?.defaultPeriod ?? periods[0];
    if (!period) throw new Error("Aucune période de vie scolaire dans Pronote");

    const nb = await notebook(session, period);
    const reasonOf = (unknown: boolean, reason?: string | false) =>
      !unknown && typeof reason === "string" && reason.trim() ? reason.trim() : undefined;

    const absences: AbsenceItem[] = nb.absences.map((a) => ({
      id: a.id,
      start: a.startDate.toISOString(),
      end: a.endDate.toISOString(),
      duration: formatDuration(a.daysMissed || 0, a.hoursMissed || 0, a.minutesMissed || 0),
      justified: a.justified,
      toJustify: !a.justified && a.shouldParentsJustify,
      reason: reasonOf(a.isReasonUnknown, a.reason),
    }));

    const delays: DelayItem[] = nb.delays.map((d) => ({
      id: d.id,
      date: d.date.toISOString(),
      minutes: d.minutes,
      justified: d.justified,
      toJustify: !d.justified && d.shouldParentsJustify,
      reason: reasonOf(d.isReasonUnknown, d.reason),
    }));

    return {
      periods: periods.map((p) => ({ id: p.id, name: p.name })),
      period: { id: period.id, name: period.name },
      absences: absences.sort(newestFirst),
      delays: delays.sort(newestFirst),
      punishments: nb.punishments
        .map((p) => ({
          id: p.id,
          title: p.title,
          date: p.dateGiven.toISOString(),
          giver: p.giver,
          reasons: p.reasons.filter(Boolean),
          workToDo: p.workToDo?.trim() ?? "",
          durationMinutes: p.durationMinutes,
          exclusion: p.exclusion,
        }))
        .sort(newestFirst),
      observations: nb.observations
        .map((o) => ({
          id: o.id,
          date: o.date.toISOString(),
          kind: o.kind,
          name: o.name,
          subject: o.subject?.name,
          comment: o.reason?.trim() || undefined,
        }))
        .sort(newestFirst),
      measures: nb.precautionaryMeasures
        .map((m) => ({
          id: m.id,
          title: m.title,
          start: m.startDate.toISOString(),
          end: m.endDate.toISOString(),
          reasons: m.reasons.filter(Boolean),
        }))
        .sort(newestFirst),
      totals: {
        absenceDays: nb.absences.reduce((s, a) => s + (a.daysMissed || 0), 0),
        absenceHours: nb.absences.reduce((s, a) => s + (a.hoursMissed || 0), 0),
        absenceMinutes: nb.absences.reduce((s, a) => s + (a.minutesMissed || 0), 0),
        delayMinutes: nb.delays.reduce((s, d) => s + (d.minutes || 0), 0),
      },
    };
  });
}
