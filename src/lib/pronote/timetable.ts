import "server-only";
import { cacheLife } from "next/cache";
import { parseTimetable, timetableFromIntervals } from "pawnote";
import { withPronote } from "./client";

// Ce qui sort d'ici est un objet "plat" et sérialisable (pas de Date, pas d'objet Pawnote),
// pour pouvoir le passer aux composants et le renvoyer en JSON.
export type ClassItem = {
  id: string;
  kind: "lesson" | "activity" | "detention";
  start: string; // ISO
  end: string; // ISO
  title: string;
  teachers: string[];
  rooms: string[];
  groups: string[];
  status?: string;
  canceled: boolean;
  exempted: boolean;
  test: boolean;
  color?: string;
};

export type DayTimetable = { date: string; classes: ClassItem[] }; // date : "YYYY-MM-DD"
export type WeekTimetable = { weekStart: string; days: DayTimetable[] };

const pad = (n: number) => String(n).padStart(2, "0");
/** Date → "YYYY-MM-DD" (heure locale du serveur). */
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Lundi de la semaine courante + `offset` semaines, au format "YYYY-MM-DD" (heure locale du serveur). */
export function mondayKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return toDateKey(d);
}

/**
 * Emploi du temps d'une semaine, à partir de son lundi ("YYYY-MM-DD").
 * Mis en cache quelques minutes côté serveur, pour ne pas solliciter Pronote à chaque affichage.
 * ⚠️ Pas de vérification d'accès ici : à appeler uniquement après `verifySession()`.
 */
export async function getWeekTimetable(weekStart: string): Promise<WeekTimetable> {
  "use cache";
  cacheLife("minutes");

  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y, m - 1, d, 0, 0, 0, 0);
  const sunday = new Date(y, m - 1, d + 6, 23, 59, 59, 999);

  const timetable = await withPronote(async (session) => {
    const raw = await timetableFromIntervals(session, monday, sunday);
    // Applique la logique officielle de Pronote (fusion des cours, cours annulés superposés…).
    parseTimetable(session, raw, {
      withCanceledClasses: true,
      withPlannedClasses: true,
      withSuperposedCanceledClasses: false,
    });
    return raw;
  });

  const days: DayTimetable[] = Array.from({ length: 7 }, (_, i) => ({
    date: toDateKey(new Date(y, m - 1, d + i)),
    classes: [],
  }));

  for (const c of timetable.classes) {
    const base = {
      id: c.id,
      start: c.startDate.toISOString(),
      end: c.endDate.toISOString(),
      color: c.backgroundColor,
    };
    let item: ClassItem;
    if (c.is === "lesson") {
      item = {
        ...base,
        kind: "lesson",
        title: c.subject?.name ?? "Cours",
        teachers: c.teacherNames,
        rooms: c.classrooms,
        groups: c.groupNames,
        status: c.status,
        canceled: c.canceled,
        exempted: c.exempted,
        test: c.test,
      };
    } else if (c.is === "activity") {
      item = {
        ...base,
        kind: "activity",
        title: c.title,
        teachers: c.attendants,
        rooms: [],
        groups: [],
        canceled: false,
        exempted: false,
        test: false,
      };
    } else {
      item = {
        ...base,
        kind: "detention",
        title: c.title ?? "Retenue",
        teachers: c.teacherNames,
        rooms: c.classrooms,
        groups: [],
        canceled: false,
        exempted: false,
        test: false,
      };
    }
    days.find((day) => day.date === toDateKey(c.startDate))?.classes.push(item);
  }

  for (const day of days) day.classes.sort((a, b) => a.start.localeCompare(b.start));
  return { weekStart, days };
}
