// Formatage des dates en français (heure locale du serveur).
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** "YYYY-MM-DD" → Date à minuit (heure locale). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
/** "4 nov." */
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso));

export const formatDay = (key: string) => {
  const s = dayFmt.format(fromDateKey(key));
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
