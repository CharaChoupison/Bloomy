// Thèmes personnalisés, sur le modèle de Vencord : l'élève importe des fichiers .css
// (avec un en-tête de métadonnées), les active un par un, et peut écrire du « CSS rapide ».
// Tout reste dans le navigateur (localStorage) : rien n'est envoyé au serveur.
// Ce fichier est partagé serveur / client : pas d'API navigateur ici.
// Guide pour écrire un thème : docs/THEMES.md.

// Préfixe « pronoti » : ancien nom de l'app, conservé pour garder les thèmes déjà importés.
export const CUSTOM_THEMES_KEY = "pronoti-custom-themes";
/** <style> qui reçoit le CSS des thèmes actifs, toujours gardé en dernier dans <head>. */
export const CUSTOM_STYLE_ID = "pronoti-custom-css";
/** ?sans-theme dans l'URL : désactive les thèmes le temps de la visite (secours si un thème casse l'affichage). */
export const SAFE_MODE_PARAM = "sans-theme";
/** Pages où le CSS personnalisé n'est jamais appliqué : un sélecteur CSS peut faire fuiter ce qu'on tape. */
export const UNTHEMED_PATHS = ["/login"];
/** Événement émis sur window quand le CSS personnalisé change (le script de <head> recale la barre du navigateur). */
export const CUSTOM_CSS_EVENT = "pronoti:custom-css";

/** Taille maximale d'un thème importé (le localStorage tourne autour de 5 Mo au total). */
export const MAX_THEME_BYTES = 300 * 1024;

export type CustomTheme = {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  css: string;
  enabled: boolean;
};

export type CustomThemesState = {
  themes: CustomTheme[];
  quickCss: string;
};

export const EMPTY_STATE: CustomThemesState = { themes: [], quickCss: "" };

export type ThemeMeta = Pick<CustomTheme, "name" | "author" | "description" | "version">;

/**
 * Lit l'en-tête du thème, au même format que Vencord / BetterDiscord :
 * le premier bloc `/** … *\/` du fichier, une ligne `@champ valeur` par champ.
 */
export function parseThemeMeta(css: string, fallbackName: string): ThemeMeta {
  const meta: Record<string, string> = {};
  const header = css.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (header) {
    let last: string | null = null;
    for (const raw of header[1].split("\n")) {
      const line = raw.replace(/^\s*\*?\s?/, "").trimEnd();
      const field = line.match(/^@(\w+)\s+(.*)$/);
      if (field) {
        last = field[1].toLowerCase();
        meta[last] = field[2].trim();
      } else if (last && line.trim()) {
        meta[last] += ` ${line.trim()}`; // suite d'une description sur plusieurs lignes
      }
    }
  }
  const clip = (v: string | undefined, max: number) => (v ?? "").slice(0, max);
  return {
    name: clip(meta.name, 60) || fallbackName,
    author: clip(meta.author, 60),
    description: clip(meta.description, 280),
    version: clip(meta.version, 20),
  };
}

/** `@import "…";` / `@import url(…) …;` (les URL Google Fonts contiennent des « ; » entre guillemets). */
const IMPORT_RULE = /@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g;

/**
 * CSS à injecter : les thèmes actifs dans l'ordre de la liste, puis le CSS rapide.
 * Chacun dans sa propre couche (@layer pronoti-user-N), déclarée après celles de l'app :
 * le suivant gagne toujours sur le précédent, et tous gagnent sur l'app, quelle que soit la spécificité.
 * Les @import sont remontés en tête : le navigateur les ignore s'ils suivent une autre règle.
 * Même logique que le script de <head> ci-dessous : garder les deux alignés.
 */
export function combinedCss(state: CustomThemesState): string {
  const sources = state.themes.filter((t) => t.enabled).map((t) => t.css);
  if (state.quickCss.trim()) sources.push(state.quickCss);
  const imports: string[] = [];
  const bodies = sources.map(
    (css, i) => `@layer pronoti-user-${i} {\n${css.replace(IMPORT_RULE, (m) => (imports.push(m), ""))}\n}`,
  );
  return [...imports, ...bodies].join("\n\n");
}

export function parseState(raw: string | null): CustomThemesState {
  if (!raw) return EMPTY_STATE;
  try {
    const v = JSON.parse(raw) as Partial<CustomThemesState>;
    return {
      themes: Array.isArray(v.themes) ? v.themes.filter((t) => t && typeof t.css === "string") : [],
      quickCss: typeof v.quickCss === "string" ? v.quickCss : "",
    };
  } catch {
    return EMPTY_STATE;
  }
}

/**
 * Morceau du script de <head> (voir preferences.ts) : injecte le CSS des thèmes avant le premier
 * affichage, puis le garde en dernier dans <head> pour qu'il passe après les feuilles de l'app.
 * Variables attendues dans la portée : d (documentElement). Définit s (le <style>) et last().
 */
export const customThemesBootSnippet = `
var s=document.createElement('style');s.id=${JSON.stringify(CUSTOM_STYLE_ID)};
try{var st=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_THEMES_KEY)})||'null');
var safe=location.search.indexOf(${JSON.stringify(SAFE_MODE_PARAM)})>-1;if(safe)d.setAttribute('data-custom-css','safe');
if(st&&!safe){var p=[],im=[];(st.themes||[]).forEach(function(t){if(t&&t.enabled&&typeof t.css==='string')p.push(t.css)});
if(typeof st.quickCss==='string'&&st.quickCss.trim())p.push(st.quickCss);
p=p.map(function(x,i){return '@layer pronoti-user-'+i+' {\\n'+x.replace(${IMPORT_RULE.toString()},function(m){im.push(m);return ''})+'\\n}'});s.textContent=im.concat(p).join('\\n\\n')}}catch(e){}
document.head.appendChild(s);s.disabled=${JSON.stringify(UNTHEMED_PATHS)}.indexOf(location.pathname)>-1;
function last(){if(document.head.lastElementChild!==s)document.head.appendChild(s)}`;
