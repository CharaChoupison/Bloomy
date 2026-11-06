import "server-only";
import { formatPoints, specialLabel } from "@/lib/grades-format";
import { getAssignmentsFor } from "@/lib/pronote/assignments";
import { getGradesFor } from "@/lib/pronote/grades";
import { getWeekTimetableFor, mondayKey, toDateKey, type ClassItem } from "@/lib/pronote/timetable";

// Contrat de GET /api/widget, lu par le script Scriptable (src/widget/pronoti.scriptable.js).
// Volontairement minimal : seulement ce que le widget affiche. Toute évolution incompatible
// doit incrémenter `v` (le script affiche alors « Mets à jour le script »).

export type WidgetClass = {
  title: string;
  start: string; // ISO
  end: string; // ISO
  room: string;
  canceled: boolean;
  test: boolean;
  /** Libellé Pronoti du statut (« Prof. absent », « Cours modifié »…), s'il y en a un. */
  status?: string;
};

export type WidgetAssignment = { subject: string; due: string /* YYYY-MM-DD */; text: string };

export type WidgetGrade = { subject: string; value: string; outOf?: string; date: string /* ISO */ };

export type WidgetData = {
  v: 1;
  generatedAt: string;
  accent: string;
  /** Cours à venir (non terminés) sur les 7 prochains jours, triés ; `null` si l'emploi du temps n'a pas pu être lu. */
  classes: WidgetClass[] | null;
  assignments: { remaining: number; items: WidgetAssignment[] } | null;
  grades: WidgetGrade[] | null;
};

const MAX_CLASSES = 12;
const MAX_ASSIGNMENTS = 6;
const MAX_GRADES = 3;
const TEXT_MAX = 90;

const shorten = (s: string) => {
  const line = s.replace(/\s+/g, " ").trim();
  return line.length > TEXT_MAX ? `${line.slice(0, TEXT_MAX - 1).trimEnd()}…` : line;
};

const toWidgetClass = (c: ClassItem): WidgetClass => ({
  title: c.title,
  start: c.start,
  end: c.end,
  room: c.rooms.join(", "),
  canceled: c.canceled,
  test: c.test,
  ...(c.status ? { status: c.status } : {}),
});

async function upcomingClasses(viewerId: string, now: Date): Promise<WidgetClass[]> {
  // Cette semaine et la suivante : le dimanche soir, le prochain cours est lundi.
  const weeks = await Promise.all([getWeekTimetableFor(viewerId, mondayKey(0)), getWeekTimetableFor(viewerId, mondayKey(1))]);
  const limit = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  return weeks
    .flatMap((w) => w.days.flatMap((d) => d.classes))
    .filter((c) => Date.parse(c.end) > now.getTime() && Date.parse(c.start) < limit)
    .slice(0, MAX_CLASSES)
    .map(toWidgetClass);
}

async function remainingAssignments(viewerId: string, now: Date) {
  const todo = (await getAssignmentsFor(viewerId, toDateKey(now))).filter((a) => !a.done);
  return {
    remaining: todo.length,
    items: todo.slice(0, MAX_ASSIGNMENTS).map((a) => ({ subject: a.subject, due: a.deadlineKey, text: shorten(a.description) })),
  };
}

async function latestGrades(viewerId: string): Promise<WidgetGrade[]> {
  const { grades } = await getGradesFor(viewerId);
  return grades.slice(0, MAX_GRADES).map((g) => ({
    subject: g.subject,
    value: formatPoints(g.value) ?? specialLabel(g.value) ?? "—",
    ...(formatPoints(g.value) && formatPoints(g.outOf) ? { outOf: formatPoints(g.outOf) } : {}),
    date: g.date,
  }));
}

/** Une section en panne ne doit pas vider tout le widget : elle passe à `null`, les autres restent. */
async function settle<T>(label: string, run: Promise<T>): Promise<T | null> {
  try {
    return await run;
  } catch (error) {
    if ((error as Error).name === "PronoteSessionLostError") throw error; // traité par la route (401)
    console.error(`[widget] ${label}`, error);
    return null;
  }
}

export async function getWidgetData(viewerId: string, accent: string): Promise<WidgetData> {
  const now = new Date();
  const [classes, assignments, grades] = await Promise.all([
    settle("emploi du temps", upcomingClasses(viewerId, now)),
    settle("devoirs", remainingAssignments(viewerId, now)),
    settle("notes", latestGrades(viewerId)),
  ]);
  return { v: 1, generatedAt: now.toISOString(), accent, classes, assignments, grades };
}
