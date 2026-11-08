import { SCHOOL_TIME_ZONE } from "./time-zone";

// Formatage des dates en français.
// - Instants (heure d'un cours, date d'une note) : dans le fuseau de l'établissement, pour que serveur
//   et navigateur affichent la même chose (voir lib/time-zone.ts).
// - Clés "YYYY-MM-DD" : dates du calendrier, sans fuseau (minuit local, formaté en local).
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: SCHOOL_TIME_ZONE });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** "YYYY-MM-DD" → Date à minuit (heure locale). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: SCHOOL_TIME_ZONE });
/** "4 nov." */
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso));

export const formatDay = (key: string) => {
  const s = dayFmt.format(fromDateKey(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const shortDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
/** "Lun. 2" */
export const formatShortDay = (key: string) => {
  const s = shortDayFmt.format(fromDateKey(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "2 – 8 novembre" ou "30 novembre – 6 décembre" */
export function formatWeekRange(weekStart: string): string {
  const start = fromDateKey(weekStart);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const endLabel = dayMonthFmt.format(end);
  const startLabel = start.getMonth() === end.getMonth() ? String(start.getDate()) : dayMonthFmt.format(start);
  return `${startLabel} – ${endLabel}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" décalé de `days` jours. */
export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  return keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Échéance d'un devoir : "Pour aujourd'hui", "Pour demain", "Pour vendredi 7 novembre". */
export function deadlineLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Pour aujourd'hui";
  if (key === addDays(todayKey, 1)) return "Pour demain";
  return `Pour ${dayFmt.format(fromDateKey(key))}`;
}
