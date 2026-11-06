"use client";

import { useSyncExternalStore } from "react";
import {
  combinedCss,
  CUSTOM_CSS_EVENT,
  CUSTOM_STYLE_ID,
  CUSTOM_THEMES_KEY,
  EMPTY_STATE,
  MAX_THEME_BYTES,
  parseState,
  parseThemeMeta,
  UNTHEMED_PATHS,
  type CustomTheme,
  type CustomThemesState,
} from "./custom-themes";

// Petit store sur localStorage, même principe que preferences-client.ts.
// Le snapshot est mis en cache par valeur brute : useSyncExternalStore exige une référence stable.
let cachedRaw: string | null | undefined;
let cachedState: CustomThemesState = EMPTY_STATE;

function readRaw(): string | null {
  try {
    return localStorage.getItem(CUSTOM_THEMES_KEY);
  } catch {
    return null; // navigation privée stricte, stockage bloqué…
  }
}

function getState(): CustomThemesState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseState(raw);
  }
  return cachedState;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(l: () => void) {
  listeners.add(l);
  // Un autre onglet a modifié les thèmes : on suit.
  const onStorage = (e: StorageEvent) => {
    if (e.key === CUSTOM_THEMES_KEY) {
      applyCss(getState());
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export class ThemeStorageError extends Error {}

function save(next: CustomThemesState) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(next));
  } catch {
    throw new ThemeStorageError("Pas assez de place pour enregistrer ce thème sur cet appareil.");
  }
  applyCss(next);
  emit();
}

function styleElement(): HTMLStyleElement {
  let el = document.getElementById(CUSTOM_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = CUSTOM_STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

/** Mode secours (?sans-theme) : rien n'est appliqué jusqu'au prochain chargement complet. */
export function isSafeMode(): boolean {
  return document.documentElement.getAttribute("data-custom-css") === "safe";
}

function applyCss(state: CustomThemesState) {
  if (isSafeMode()) return;
  styleElement().textContent = combinedCss(state);
  window.dispatchEvent(new Event(CUSTOM_CSS_EVENT));
}

/** Coupe le CSS personnalisé sur les pages sensibles (connexion), le remet ailleurs. */
export function syncCustomCssWithPath(pathname: string) {
  const el = document.getElementById(CUSTOM_STYLE_ID) as HTMLStyleElement | null;
  if (!el) return;
  const disabled = UNTHEMED_PATHS.includes(pathname);
  if (el.disabled !== disabled) {
    el.disabled = disabled;
    window.dispatchEvent(new Event(CUSTOM_CSS_EVENT));
  }
}

export function useCustomThemes(): CustomThemesState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);
}

export function useSafeMode(): boolean {
  return useSyncExternalStore(
    () => () => {},
    isSafeMode,
    () => false,
  );
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Ajoute un thème à partir du texte d'un fichier .css. Activé tout de suite : l'élève voit le résultat.
 * Un thème du même nom est remplacé (mise à jour d'une nouvelle version) en gardant sa place.
 */
export function installTheme(css: string, fileName: string): CustomTheme {
  if (new Blob([css]).size > MAX_THEME_BYTES) {
    throw new ThemeStorageError(`Ce fichier est trop lourd (${Math.round(MAX_THEME_BYTES / 1024)} Ko maximum).`);
  }
  if (!css.trim()) throw new ThemeStorageError("Ce fichier est vide.");
  const state = getState();
  const meta = parseThemeMeta(css, fileName.replace(/\.css$/i, "") || "Thème sans nom");
  const existing = state.themes.find((t) => t.name === meta.name);
  const theme: CustomTheme = { id: existing?.id ?? newId(), ...meta, css, enabled: true };
  const themes = existing
    ? state.themes.map((t) => (t.id === existing.id ? theme : t))
    : [...state.themes, theme];
  save({ ...state, themes });
  return theme;
}

export function setThemeEnabled(id: string, enabled: boolean) {
  const state = getState();
  save({ ...state, themes: state.themes.map((t) => (t.id === id ? { ...t, enabled } : t)) });
}

export function removeTheme(id: string) {
  const state = getState();
  save({ ...state, themes: state.themes.filter((t) => t.id !== id) });
}

/** Remet un thème supprimé (bouton « Annuler »), à sa place d'origine. */
export function restoreTheme(theme: CustomTheme, index: number) {
  const state = getState();
  if (state.themes.some((t) => t.id === theme.id)) return;
  const themes = [...state.themes];
  themes.splice(Math.min(index, themes.length), 0, theme);
  save({ ...state, themes });
}

export function setQuickCss(quickCss: string) {
  save({ ...getState(), quickCss });
}
