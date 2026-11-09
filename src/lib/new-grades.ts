// Notes « nouvelles » : celles que l'élève n'a pas encore vues dans l'écran Notes (fonctions pures,
// le stockage est dans new-grades-client.ts).
//
// On ne se fie pas à la date de la note : c'est la date de l'évaluation, et un prof peut saisir une
// note plusieurs semaines plus tard. Ce qui compte, c'est « est-ce que je l'ai déjà vue ? ».

/** Ce qu'il faut d'une note pour savoir si elle est nouvelle. */
export type GradeStamp = { id: string; date: string };

/** Sans historique (première visite, stockage vidé) : une note est nouvelle pendant une semaine. */
export const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/** Nombre d'identifiants gardés : largement plus qu'une année de notes, mais borné. */
export const SEEN_CAP = 1000;

/**
 * Est-ce une note nouvelle ? `seen` = identifiants déjà vus, ou `null` s'il n'y a pas encore
 * d'historique : on retombe alors sur la date, pour ne pas tout marquer « Nouveau » d'un coup.
 */
export function isNewGrade(g: GradeStamp, seen: ReadonlySet<string> | null, now = Date.now()): boolean {
  if (seen) return !seen.has(g.id);
  return now - Date.parse(g.date) < NEW_FOR_MS;
}

export function countNewGrades(grades: readonly GradeStamp[], seen: ReadonlySet<string> | null, now = Date.now()) {
  return grades.filter((g) => isNewGrade(g, seen, now)).length;
}

/** Ajoute des identifiants vus, les plus récents en dernier, en gardant au plus `cap` éléments. */
export function mergeSeen(seen: readonly string[] | null, ids: readonly string[], cap = SEEN_CAP): string[] {
  const set = new Set(seen ?? []);
  for (const id of ids) {
    set.delete(id); // remis en fin de liste : il vient d'être vu
    set.add(id);
  }
  const all = [...set];
  return all.length > cap ? all.slice(all.length - cap) : all;
}

/** Lit une liste d'identifiants stockée en JSON ; `null` si absente ou illisible. */
export function parseIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

/** Lit une liste de notes (identifiant + date) stockée en JSON ; liste vide si illisible. */
export function parseStamps(raw: string | null): GradeStamp[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (v): v is GradeStamp => typeof v?.id === "string" && typeof v?.date === "string",
    );
  } catch {
    return [];
  }
}
