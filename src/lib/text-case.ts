// Les titres Pronote arrivent souvent ENTIÈREMENT EN MAJUSCULES : c'est lu comme un cri et c'est plus
// lent à lire (pas de silhouette de mot). On les remet en casse de phrase, en gardant les sigles courts.

/** Mots courts qui ne sont pas des sigles : à mettre en minuscules. */
const SHORT_WORDS = new Set([
  "a", "à", "au", "aux", "ce", "ces", "cet", "d", "de", "des", "du", "en", "es", "est", "et", "été", "il",
  "ils", "j", "je", "l", "la", "le", "les", "leur", "lui", "m", "ma", "me", "mes", "mon", "n", "ne", "ni",
  "nos", "ou", "où", "par", "pas", "pour", "qu", "que", "qui", "s", "sa", "se", "ses", "si", "son", "sur",
  "t", "ta", "te", "tes", "ton", "tu", "un", "une", "vos", "y", "jour", "mai", "fin", "rdv",
]);

const LOCALE = "fr-FR";

/**
 * "CALENDRIER DST - MASTERS" → "Calendrier DST - masters".
 * Ne touche pas aux titres qui ont déjà des minuscules (l'auteur a choisi sa casse).
 */
export function calmShouting(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4 || letters !== letters.toLocaleUpperCase(LOCALE)) return text;

  let first = true;
  return text.replace(/\p{L}+/gu, (word) => {
    const lower = word.toLocaleLowerCase(LOCALE);
    const isFirst = first;
    first = false;
    // Sigle probable (DST, BTS, CDI) : on le garde tel quel.
    if (word.length > 1 && word.length <= 3 && !SHORT_WORDS.has(lower)) return word;
    return isFirst ? lower.charAt(0).toLocaleUpperCase(LOCALE) + lower.slice(1) : lower;
  });
}
