"use client";

import { useSyncExternalStore } from "react";
import {
  ACCENT_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  isAccent,
  isThemePreference,
  ONBOARDED_COOKIE,
  PREFERENCE_MAX_AGE,
  THEME_COOKIE,
  type Accent,
  type ThemePreference,
} from "./preferences";

function writeCookie(name: string, value: string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${PREFERENCE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

// Petit store : les composants qui affichent le choix courant se mettent à jour ensemble
// (par exemple le nuancier des réglages et celui d'un autre onglet ouvert).
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Fondu de 200 ms le temps du changement (sauf si l'élève réduit les animations). */
function withTransition(apply: () => void) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("theme-transition");
  apply();
  if (!reduce) window.setTimeout(() => root.classList.remove("theme-transition"), 250);
}

export function setAccent(accent: Accent) {
  withTransition(() => document.documentElement.setAttribute("data-accent", accent));
  writeCookie(ACCENT_COOKIE, accent);
  emit();
}

export function setThemePreference(theme: ThemePreference) {
  withTransition(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  });
  writeCookie(THEME_COOKIE, theme); // la barre du navigateur suit via le script de app/layout.tsx
  emit();
}

export function markOnboarded() {
  writeCookie(ONBOARDED_COOKIE, "1");
}

const getAccent = (): Accent => {
  const v = readCookie(ACCENT_COOKIE);
  return isAccent(v) ? v : DEFAULT_ACCENT;
};
const getTheme = (): ThemePreference => {
  const v = readCookie(THEME_COOKIE);
  return isThemePreference(v) ? v : DEFAULT_THEME;
};

export function useAccent(): Accent {
  return useSyncExternalStore(subscribe, getAccent, () => DEFAULT_ACCENT);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
}
