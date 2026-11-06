// Préférences d'affichage de l'élève (couleur d'accent, thème) et fin de l'onboarding.
// Stockées dans des cookies lisibles côté client : ce ne sont pas des données sensibles,
// et le script de app/layout.tsx doit pouvoir les lire avant le premier affichage.
// Ce fichier est partagé serveur / client : pas d'API navigateur ici.

export const ACCENTS = [
  { id: "bleu", label: "Bleu" },
  { id: "violet", label: "Violet" },
  { id: "framboise", label: "Framboise" },
  { id: "ocean", label: "Océan" },
  { id: "sapin", label: "Sapin" },
  { id: "graphite", label: "Graphite" },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: Accent = "bleu";

export const THEMES = [
  { id: "auto", label: "Automatique" },
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
] as const;

export type ThemePreference = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemePreference = "auto";

export const ACCENT_COOKIE = "pronoti-accent";
export const THEME_COOKIE = "pronoti-theme";
export const ONBOARDED_COOKIE = "pronoti-onboarded";
export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 mois, le maximum accepté par les navigateurs

export const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.id === v);
export const isThemePreference = (v: unknown): v is ThemePreference => THEMES.some((t) => t.id === v);

/** Couleur de la barre du navigateur (theme-color), alignée sur le token bg. */
export const THEME_COLOR = { light: "#f5f5f7", dark: "#0b0b0d" } as const;

/**
 * Script exécuté dans <head> avant l'affichage :
 * - pose data-accent / data-theme sur <html> à partir des cookies (pas de flash de la mauvaise couleur) ;
 * - garde les <meta name="theme-color"> (barre du navigateur) alignées sur le thème forcé,
 *   y compris quand Next les réinsère ou quand l'élève change de thème.
 */
export const preferencesBootScript = `(function(){try{
var c=document.cookie,d=document.documentElement;
function g(n){var m=c.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?m[1]:null}
var a=g(${JSON.stringify(ACCENT_COOKIE)}),t=g(${JSON.stringify(THEME_COOKIE)});
if(${JSON.stringify(ACCENTS.map((x) => x.id))}.indexOf(a)>-1)d.setAttribute('data-accent',a);
if(t==='light'||t==='dark')d.setAttribute('data-theme',t);
var L=${JSON.stringify(THEME_COLOR.light)},D=${JSON.stringify(THEME_COLOR.dark)};
function sync(){var f=d.getAttribute('data-theme');document.head.querySelectorAll('meta[name="theme-color"]').forEach(function(m){
var v=f==='dark'?D:f==='light'?L:((m.getAttribute('media')||'').indexOf('dark')>-1?D:L);if(m.content!==v)m.content=v})}
var o=new MutationObserver(sync);o.observe(document.head,{childList:true});o.observe(d,{attributes:true,attributeFilter:['data-theme']});
}catch(e){}})();`;
