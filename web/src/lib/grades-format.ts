// Mise en forme des notes Pronote (partagé serveur / client, sans dépendance à Pawnote).
import type { GradeValue } from "@/lib/pronote/grades";

// Valeurs de GradeKind dans Pawnote.
export const GRADE_KIND = {
  Error: -1,
  Grade: 0,
  Absent: 1,
  Exempted: 2,
  NotGraded: 3,
  Unfit: 4,
  Unreturned: 5,
  AbsentZero: 6,
  UnreturnedZero: 7,
  Congratulations: 8,
} as const;

/** Libellé des cas particuliers (affiché comme un mot, jamais comme une note). */
const SPECIAL_LABELS: Record<number, string> = {
  [GRADE_KIND.Absent]: "Absent·e",
  [GRADE_KIND.Exempted]: "Dispensé·e",
  [GRADE_KIND.NotGraded]: "Non noté",
  [GRADE_KIND.Unfit]: "Inapte",
  [GRADE_KIND.Unreturned]: "Non rendu",
  [GRADE_KIND.AbsentZero]: "Absent·e",
  [GRADE_KIND.UnreturnedZero]: "Non rendu",
  [GRADE_KIND.Congratulations]: "Félicitations",
  [GRADE_KIND.Error]: "Indisponible",
};

const numberFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Les cas « …(0) » comptent comme un zéro dans la moyenne. */
export const isNumeric = (v?: GradeValue): v is GradeValue =>
  !!v &&
  (v.kind === GRADE_KIND.Grade || v.kind === GRADE_KIND.AbsentZero || v.kind === GRADE_KIND.UnreturnedZero) &&
  Number.isFinite(v.points);

/** "14,5" — ou undefined si ce n'est pas un nombre. */
export const formatPoints = (v?: GradeValue): string | undefined =>
  isNumeric(v) ? numberFmt.format(v.points) : undefined;

/** Mot pour un cas particulier ("Absent·e"…), ou undefined pour une note normale. */
export const specialLabel = (v?: GradeValue): string | undefined =>
  v && v.kind !== GRADE_KIND.Grade ? SPECIAL_LABELS[v.kind] : undefined;

/** Phrase complète pour les lecteurs d'écran : "14,5 sur 20". */
export function spokenGrade(v?: GradeValue, outOf?: GradeValue): string {
  const special = specialLabel(v);
  const points = formatPoints(v);
  const max = formatPoints(outOf);
  if (points !== undefined) return `${points}${max ? ` sur ${max}` : ""}${special ? `, ${special}` : ""}`;
  return special ?? "Pas de note";
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
/** "4 nov." */
export const formatGradeDate = (iso: string) => dateFmt.format(new Date(iso));
