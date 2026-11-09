// Simulateur de moyenne (fonctions pures). « Si j'ai 15 au prochain devoir, ma moyenne devient… ? »
//
// Pronote ne donne pas tout ce qu'il faut pour refaire son calcul à l'identique (coefficients des
// matières, réglages de l'établissement). On ne remplace donc pas sa moyenne : on calcule l'ÉCART
// que provoquent les notes simulées avec la règle habituelle, et on l'applique à la moyenne officielle.
import { isNumeric } from "./grades-format";
import type { GradeValue } from "./pronote/grades";

export type SimGrade = {
  value: GradeValue;
  outOf: GradeValue;
  coefficient: number;
  isBonus?: boolean;
  isOptional?: boolean;
};

const on20 = (g: SimGrade): number | undefined =>
  isNumeric(g.value) && isNumeric(g.outOf) && g.outOf.points > 0 ? (g.value.points / g.outOf.points) * 20 : undefined;

/**
 * Moyenne sur 20 d'une matière, règle Pronote habituelle :
 * - moyenne pondérée par les coefficients des notes chiffrées ;
 * - note facultative : comptée seulement si elle fait monter la moyenne ;
 * - note bonus : seuls les points au-dessus de 10 s'ajoutent.
 * `undefined` sans note chiffrée.
 */
export function subjectAverage20(grades: readonly SimGrade[]): number | undefined {
  let sum = 0;
  let weight = 0;
  const optional: [number, number][] = [];
  const bonus: [number, number][] = [];

  for (const g of grades) {
    const v = on20(g);
    const c = g.coefficient > 0 ? g.coefficient : 0;
    if (v === undefined || c === 0) continue;
    if (g.isBonus) bonus.push([v, c]);
    else if (g.isOptional) optional.push([v, c]);
    else {
      sum += v * c;
      weight += c;
    }
  }

  // Facultatives : de la meilleure à la moins bonne, tant qu'elles améliorent la moyenne.
  for (const [v, c] of optional.sort(([a], [b]) => b - a)) {
    if (weight === 0 || v > sum / weight) {
      sum += v * c;
      weight += c;
    }
  }
  if (weight === 0) return undefined;

  const extra = bonus.reduce((acc, [v, c]) => acc + Math.max(0, v - 10) * c, 0);
  return Math.min(20, (sum + extra) / weight);
}

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export type Simulation = {
  /** Moyenne de la matière, avant / après les notes simulées, sur le barème de la moyenne officielle. */
  subject: { before?: number; after?: number };
  /** Moyenne générale estimée, avant / après (si Pronote en donne une). */
  overall: { before?: number; after?: number };
};

/**
 * Simule l'ajout de notes dans une matière.
 * - `official` : moyenne de la matière selon Pronote (et son barème) ; sans elle, la moyenne recalculée ;
 * - `overall` / `subjectCount` : moyenne générale et nombre de matières qui y comptent. Les coefficients
 *   des matières sont inconnus : on suppose qu'elles pèsent pareil (estimation, annoncée comme telle).
 */
export function simulate({
  grades,
  extra,
  official,
  officialOutOf,
  overall,
  subjectCount,
}: {
  grades: readonly SimGrade[];
  extra: readonly SimGrade[];
  official?: GradeValue;
  officialOutOf?: GradeValue;
  overall?: GradeValue;
  subjectCount: number;
}): Simulation {
  const scale = isNumeric(officialOutOf) && officialOutOf.points > 0 ? officialOutOf.points : 20;
  const computedBefore = subjectAverage20(grades);
  const computedAfter = subjectAverage20([...grades, ...extra]);

  let before: number | undefined;
  let after: number | undefined;
  if (computedAfter !== undefined) {
    if (isNumeric(official) && computedBefore !== undefined) {
      before = official.points;
      after = clamp(official.points + ((computedAfter - computedBefore) * scale) / 20, scale);
    } else {
      before = computedBefore === undefined ? undefined : (computedBefore * scale) / 20;
      after = (computedAfter * scale) / 20;
    }
  }

  let overallAfter: number | undefined;
  if (isNumeric(overall) && after !== undefined) {
    // Une matière sans moyenne jusqu'ici entre dans la moyenne générale.
    const count = before === undefined ? subjectCount + 1 : subjectCount;
    const delta20 = before === undefined ? ((after * 20) / scale - overall.points) : ((after - before) * 20) / scale;
    overallAfter = count > 0 ? clamp(overall.points + delta20 / count, 20) : undefined;
  }

  return {
    subject: { before: before === undefined ? undefined : round2(before), after: after === undefined ? undefined : round2(after) },
    overall: {
      before: isNumeric(overall) ? overall.points : undefined,
      after: overallAfter === undefined ? undefined : round2(overallAfter),
    },
  };
}

/** Lit un nombre saisi à la française (« 12,5 »). `undefined` si ce n'est pas un nombre. */
export function parseFrenchNumber(input: string): number | undefined {
  const s = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
