// Organisation de l'écran Devoirs (fonctions pures, partagées serveur / client).

/** Ce qu'il faut d'un devoir pour le ranger. */
export type AssignmentLike = { id: string; deadlineKey: string; done: boolean };

/** Jours remontés dans le passé pour retrouver les devoirs en retard. */
export const OVERDUE_DAYS = 14;
/** Jours à venir affichés. */
export const UPCOMING_DAYS = 28;

export type AssignmentFilter = "todo" | "all";

export const parseFilter = (v: unknown): AssignmentFilter => (v === "tout" ? "all" : "todo");

/**
 * Sépare les devoirs en retard (échéance passée, pas faits) de ceux à venir, regroupés par échéance.
 * Un devoir passé et fait n'a plus d'intérêt : il n'apparaît pas.
 *
 * `filter` « À faire » cache les devoirs faits, sauf ceux de `keep` : ceux que l'élève vient de cocher
 * restent en place (grisés) pour pouvoir être décochés, rien ne disparaît sous le doigt.
 */
export function organizeAssignments<T extends AssignmentLike>(
  items: readonly T[],
  todayKey: string,
  filter: AssignmentFilter = "all",
  keep: ReadonlySet<string> = new Set(),
): { overdue: T[]; upcoming: [string, T[]][]; left: number } {
  const visible = (a: T) => filter === "all" || !a.done || keep.has(a.id);
  const overdue: T[] = [];
  const groups = new Map<string, T[]>();
  let left = 0;

  for (const a of items) {
    const past = a.deadlineKey < todayKey;
    if (!a.done) left++;
    if (past) {
      if (!a.done || keep.has(a.id)) overdue.push(a);
    } else if (visible(a)) {
      groups.set(a.deadlineKey, [...(groups.get(a.deadlineKey) ?? []), a]);
    }
  }

  const upcoming = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { overdue, upcoming, left };
}
