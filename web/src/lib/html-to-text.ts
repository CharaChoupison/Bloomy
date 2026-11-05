// Convertit le HTML des éditeurs Pronote (consignes de devoirs, contenus de cours) en texte brut.
// On n'injecte jamais ce HTML dans la page : pas de risque de script ou de style parasite.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  hellip: "…",
  euro: "€",
  ndash: "–",
  mdash: "—",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      // Début et fin de bloc = retour à la ligne (les lignes vides en trop sont fusionnées plus bas).
      .replace(/<\/?(p|div|h[1-6]|tr|ul|ol|blockquote)(\s[^>]*)?>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
