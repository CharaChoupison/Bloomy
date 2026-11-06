// Mise en forme d'une journée de cours (fonctions pures, partagées serveur / client) :
// fusion des séances identiques qui se suivent, et pauses entre les cours.
import type { ClassItem } from "@/lib/pronote/timetable";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";

/** Deux séances séparées d'au plus ce délai sont considérées comme « à la suite ». */
const CONTIGUOUS_MS = 5 * 60_000;
/** En dessous, pas de ligne « Pause » (simple changement de salle). */
const MIN_BREAK_MS = 5 * 60_000;
/** Pause déjeuner : au moins 45 min, qui recouvre 11:30 – 14:00 (heure de l'établissement). */
const LUNCH_MIN_MS = 45 * 60_000;
const LUNCH_WINDOW = { from: 11 * 60 + 30, to: 14 * 60 };

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Même cours au sens de l'élève : même matière, mêmes profs, salles, groupes et même état. */
function sameClass(a: ClassItem, b: ClassItem): boolean {
  return (
    a.kind === b.kind &&
    a.title === b.title &&
    a.color === b.color &&
    a.status === b.status &&
    a.canceled === b.canceled &&
    a.exempted === b.exempted &&
    a.test === b.test &&
    sameList(a.teachers, b.teachers) &&
    sameList(a.rooms, b.rooms) &&
    sameList(a.groups, b.groups)
  );
}

/**
 * Fusionne les séances identiques qui se suivent (ex. Audit 10:00–10:55 + 10:55–12:40 → 10:00–12:40).
 * Le bloc garde l'id de la première séance et, dans `sessionStarts`, le début de chaque séance
 * (les contenus de cours sont rattachés à l'heure de début, voir lib/lesson-anchor.ts).
 * `classes` doit être trié par heure de début.
 */
export function mergeConsecutive(classes: ClassItem[]): ClassItem[] {
  const out: ClassItem[] = [];
  for (const c of classes) {
    const prev = out.at(-1);
    if (prev && sameClass(prev, c) && Date.parse(c.start) - Date.parse(prev.end) <= CONTIGUOUS_MS && c.end > prev.end) {
      out[out.length - 1] = {
        ...prev,
        end: c.end,
        sessionStarts: [...(prev.sessionStarts ?? [prev.start]), ...(c.sessionStarts ?? [c.start])],
      };
    } else {
      out.push(c);
    }
  }
  return out;
}

const minutesFmt = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: SCHOOL_TIME_ZONE,
});
/** Minutes depuis minuit, dans le fuseau de l'établissement. */
function minuteOfDay(iso: string): number {
  const parts = minutesFmt.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** "10 min", "1 h 35", "2 h". */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 60_000);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export type DayEntry =
  | { type: "class"; item: ClassItem }
  | { type: "break"; key: string; lunch: boolean; start: string; end: string; duration: string };

/**
 * Cours de la journée entrecoupés de leurs pauses. Une seule pause déjeuner par jour :
 * la première assez longue qui recouvre la mi-journée.
 */
export function withBreaks(classes: ClassItem[]): DayEntry[] {
  const entries: DayEntry[] = [];
  let lunchFound = false;
  // Fin la plus tardive vue jusqu'ici : un cours qui en chevauche un autre ne crée pas de « pause ».
  let latestEnd: string | undefined;

  for (const c of classes) {
    if (latestEnd) {
      const gap = Date.parse(c.start) - Date.parse(latestEnd);
      if (gap >= MIN_BREAK_MS) {
        const from = minuteOfDay(latestEnd);
        const to = minuteOfDay(c.start);
        const lunch = !lunchFound && gap >= LUNCH_MIN_MS && from < LUNCH_WINDOW.to && to > LUNCH_WINDOW.from;
        if (lunch) lunchFound = true;
        entries.push({ type: "break", key: `pause-${latestEnd}`, lunch, start: latestEnd, end: c.start, duration: formatDuration(gap) });
      }
    }
    entries.push({ type: "class", item: c });
    if (!latestEnd || c.end > latestEnd) latestEnd = c.end;
  }
  return entries;
}
