// Couleurs des matières. Beaucoup d'établissements ne règlent pas les couleurs dans Pronote (tout
// arrive en gris ou en blanc) : Bloomy donne donc à chaque matière une couleur de sa propre palette,
// pensée pour les thèmes clair et sombre (tokens --subject-* dans globals.css).
//
// - Une matière reçoit sa couleur la première fois qu'elle s'affiche (la moins utilisée de la palette),
//   puis la garde : même couleur sur tous les écrans, et pas deux fois la même tant qu'il en reste.
// - L'élève peut la changer dans Réglages.
// - Tout reste dans le navigateur (localStorage). Le script de <head> pose les couleurs avant le
//   premier affichage : pas de flash, et le serveur n'a rien à savoir.
//
// Les éléments colorés portent data-subject="<clé>" et lisent var(--subject) / var(--subject-soft).
// Ce fichier est partagé serveur / client : pas d'API navigateur ici.

export const SUBJECT_COLORS = [
  { id: "bleu", label: "Bleu" },
  { id: "violet", label: "Violet" },
  { id: "rose", label: "Rose" },
  { id: "corail", label: "Corail" },
  { id: "ambre", label: "Ambre" },
  { id: "olive", label: "Olive" },
  { id: "vert", label: "Vert" },
  { id: "turquoise", label: "Turquoise" },
  { id: "ciel", label: "Ciel" },
  { id: "brun", label: "Brun" },
  { id: "ardoise", label: "Ardoise" },
] as const;

export type SubjectColor = (typeof SUBJECT_COLORS)[number]["id"];
export const isSubjectColor = (v: unknown): v is SubjectColor => SUBJECT_COLORS.some((c) => c.id === v);

/** Matière → couleur choisie, et le nom tel qu'affiché (pour la liste des réglages). */
export type SubjectColorMap = Record<string, { color: SubjectColor; name: string }>;

export const SUBJECT_COLORS_KEY = "bloomy-subject-colors";
export const SUBJECT_STYLE_ID = "bloomy-subject-colors";

/** « Histoire-Géographie » et « HISTOIRE GEOGRAPHIE » → « histoire-geographie » : une seule matière. */
export function subjectKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Règles CSS d'une table de couleurs (les clés ne contiennent que [a-z0-9-] : rien à échapper). */
export function subjectColorsCss(map: SubjectColorMap): string {
  return Object.entries(map)
    .filter(([key, v]) => /^[a-z0-9-]+$/.test(key) && isSubjectColor(v.color))
    .map(([key, v]) => `[data-subject="${key}"]{--subject:var(--subject-${v.color});--subject-soft:var(--subject-${v.color}-soft)}`)
    .join("");
}

/** Relit le localStorage sans faire confiance à son contenu. */
export function parseSubjectColors(raw: string | null): SubjectColorMap {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return {};
    const map: SubjectColorMap = {};
    for (const [key, v] of Object.entries(data as Record<string, unknown>)) {
      const entry = v as { color?: unknown; name?: unknown } | null;
      if (/^[a-z0-9-]+$/.test(key) && entry && isSubjectColor(entry.color) && typeof entry.name === "string") {
        map[key] = { color: entry.color, name: entry.name.slice(0, 120) };
      }
    }
    return map;
  } catch {
    return {};
  }
}

/** Couleur pour une nouvelle matière : la moins utilisée, dans l'ordre de la palette en cas d'égalité. */
export function nextSubjectColor(map: SubjectColorMap): SubjectColor {
  const used = new Map<SubjectColor, number>(SUBJECT_COLORS.map((c) => [c.id, 0]));
  for (const v of Object.values(map)) used.set(v.color, (used.get(v.color) ?? 0) + 1);
  let best: SubjectColor = SUBJECT_COLORS[0].id;
  for (const { id } of SUBJECT_COLORS) if ((used.get(id) ?? 0) < (used.get(best) ?? 0)) best = id;
  return best;
}

/**
 * Morceau du script de <head> (voir preferences.ts) : pose les couleurs enregistrées avant l'affichage.
 * Volontairement minimal : la validation complète est refaite côté client par SubjectColorsSync.
 */
export const subjectColorsBootSnippet = `try{var sm=JSON.parse(localStorage.getItem(${JSON.stringify(SUBJECT_COLORS_KEY)})||'{}'),sc='';
for(var sk in sm){var sv=sm[sk];if(/^[a-z0-9-]+$/.test(sk)&&sv&&/^[a-z]+$/.test(sv.color))sc+='[data-subject="'+sk+'"]{--subject:var(--subject-'+sv.color+');--subject-soft:var(--subject-'+sv.color+'-soft)}'}
var ss=document.createElement('style');ss.id=${JSON.stringify(SUBJECT_STYLE_ID)};ss.textContent=sc;document.head.appendChild(ss)}catch(e){}`;
