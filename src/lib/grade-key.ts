// Identifiant stable d'une note (fonction pure).
//
// L'identifiant que Pronote donne à une note (« N ») n'est pas fiable : pour certaines notes, il est
// chiffré avec la session et change à chaque reconnexion. Une même note passait alors pour nouvelle
// à chaque vérification (notification toutes les 15 min, pastille « Nouveau » qui revient).
// On identifie donc une note par ce qui la décrit et ne bouge pas : date, matière, intitulé, barème,
// coefficient et nature. La valeur est exclue : une note corrigée n'est pas une nouvelle note.

export type GradeIdentity = {
  date: string;
  subject: string;
  comment: string;
  outOf: { kind: number; points: number };
  coefficient: number;
  isBonus: boolean;
  isOptional: boolean;
};

/** Hachage 53 bits (cyrb53) : court, déterministe, sans dépendance. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Identifiants stables, dans l'ordre des notes reçues. Deux notes identiques en tout point
 * (même jour, même matière, même intitulé…) sont départagées par leur rang.
 */
export function stableGradeIds(grades: readonly GradeIdentity[]): string[] {
  const seen = new Map<string, number>();
  return grades.map((g) => {
    const base = hash(
      [
        g.date.slice(0, 10),
        g.subject.trim().toLowerCase(),
        g.comment.trim().toLowerCase(),
        `${g.outOf.kind}:${g.outOf.points}`,
        g.coefficient,
        g.isBonus ? "b" : "",
        g.isOptional ? "f" : "",
      ].join("|"),
    );
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? `g${base}` : `g${base}-${n}`;
  });
}
