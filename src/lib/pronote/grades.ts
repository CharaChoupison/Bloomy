import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { gradesOverview, TabLocation, type GradeValue as PawnoteGradeValue } from "pawnote";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";
import { viewerTag } from "./cache-tags";

// Objets "plats" et sérialisables (pas de Date ni d'objet Pawnote), comme pour l'emploi du temps.

/** Valeur d'une note Pronote : des points, ou un cas particulier (absent, dispensé…). Voir lib/grades-format.ts. */
export type GradeValue = { kind: number; points: number };

export type GradeItem = {
  id: string;
  date: string; // ISO
  subjectId: string;
  subject: string;
  color?: string;
  /** Intitulé du devoir donné par le prof (peut être vide). */
  comment: string;
  value: GradeValue;
  outOf: GradeValue;
  classAverage?: GradeValue;
  min?: GradeValue;
  max?: GradeValue;
  coefficient: number;
  isBonus: boolean;
  isOptional: boolean;
};

export type SubjectAverage = {
  subjectId: string;
  subject: string;
  color?: string;
  student?: GradeValue;
  classAverage?: GradeValue;
  min?: GradeValue;
  max?: GradeValue;
  outOf?: GradeValue;
};

export type GradesPeriod = { id: string; name: string };

export type GradesView = {
  periods: GradesPeriod[];
  period: GradesPeriod;
  overall?: GradeValue;
  classOverall?: GradeValue;
  grades: GradeItem[]; // du plus récent au plus ancien
  subjects: SubjectAverage[]; // dans l'ordre de Pronote
};

const plain = (v?: PawnoteGradeValue): GradeValue | undefined => (v ? { kind: v.kind, points: v.points } : undefined);

/**
 * Notes d'une période (par défaut : la période en cours selon Pronote).
 * Mis en cache quelques minutes côté serveur.
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getGrades(periodId?: string): Promise<GradesView> {
  const viewer = await verifySession();
  return getGradesFor(viewer.id, periodId);
}

/** Comme getGrades(), pour un élève déjà authentifié autrement (code d'accès du widget). */
export async function getGradesFor(viewerId: string, periodId?: string): Promise<GradesView> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));

  return withPronote(viewerId, async (session) => {
    const tab = session.userResource.tabs.get(TabLocation.Grades);
    const periods = tab?.periods.length ? tab.periods : session.instance.periods;
    const period =
      periods.find((p) => p.id === periodId) ?? tab?.defaultPeriod ?? periods[0];
    if (!period) throw new Error("Aucune période de notes dans Pronote");

    const overview = await gradesOverview(session, period);

    // Les notes ne portent pas la couleur de la matière : on la reprend des moyennes.
    const colors = new Map(overview.subjectsAverages.map((s) => [s.subject.id, s.backgroundColor]));

    const grades: GradeItem[] = overview.grades
      .map((g) => ({
        id: g.id,
        date: g.date.toISOString(),
        subjectId: g.subject.id,
        subject: g.subject.name,
        color: colors.get(g.subject.id) || undefined,
        comment: g.comment.trim(),
        value: plain(g.value)!,
        outOf: plain(g.outOf)!,
        classAverage: plain(g.average),
        min: plain(g.min),
        max: plain(g.max),
        coefficient: g.coefficient,
        isBonus: g.isBonus,
        isOptional: g.isOptional,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const subjects: SubjectAverage[] = overview.subjectsAverages.map((s) => ({
      subjectId: s.subject.id,
      subject: s.subject.name,
      color: s.backgroundColor || undefined,
      student: plain(s.student),
      classAverage: plain(s.class_average),
      min: plain(s.min),
      max: plain(s.max),
      outOf: plain(s.outOf),
    }));

    return {
      periods: periods.map((p) => ({ id: p.id, name: p.name })),
      period: { id: period.id, name: period.name },
      overall: plain(overview.overallAverage),
      classOverall: plain(overview.classAverage),
      grades,
      subjects,
    };
  });
}
