// Identifiant stable d'un devoir, pour les notifications (fonction pure).
//
// Comme pour les notes (lib/grade-key.ts), l'identifiant Pronote d'un devoir est chiffré avec la
// session : il change à chaque reconnexion, et le même devoir passait pour nouveau à chaque
// vérification (notification toutes les 15 min). On identifie donc un devoir par sa matière et son
// échéance. La consigne est exclue : un devoir dont l'enseignant corrige le texte n'est pas un
// nouveau devoir. Plusieurs devoirs de la même matière pour le même jour sont départagés par leur rang.
//
// L'identifiant Pronote reste celui des actions (« fait », dépôt de copie) : celui-ci ne sert qu'à comparer.

import { stableHash } from "./grade-key";

export type AssignmentIdentity = { subject: string; deadlineKey: string };

/** Identifiants stables, dans l'ordre des devoirs reçus. */
export function stableAssignmentIds(assignments: readonly AssignmentIdentity[]): string[] {
  const seen = new Map<string, number>();
  return assignments.map((a) => {
    const base = stableHash([a.deadlineKey, a.subject.trim().toLowerCase()].join("|"));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? `d${base}` : `d${base}-${n}`;
  });
}
