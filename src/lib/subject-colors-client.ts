"use client";

import { useSyncExternalStore } from "react";
import {
  nextSubjectColor,
  parseSubjectColors,
  SUBJECT_COLORS_KEY,
  SUBJECT_STYLE_ID,
  subjectColorsCss,
  type SubjectColor,
  type SubjectColorMap,
} from "./subject-colors";

// Petit store partagé : la synchronisation de l'écran et la liste des réglages lisent la même table.
const listeners = new Set<() => void>();
let cache: { raw: string | null; map: SubjectColorMap } | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(SUBJECT_COLORS_KEY);
  } catch {
    return null; // navigation privée stricte, stockage bloqué : les matières restent neutres
  }
}

export function getSubjectColors(): SubjectColorMap {
  const raw = readRaw();
  if (!cache || cache.raw !== raw) cache = { raw, map: parseSubjectColors(raw) };
  return cache.map;
}

const EMPTY: SubjectColorMap = {};

function save(map: SubjectColorMap) {
  try {
    localStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(map));
  } catch {
    // Stockage indisponible : les couleurs s'appliquent quand même pour cette visite.
  }
  cache = { raw: readRaw(), map };
  applyCss(map);
  listeners.forEach((l) => l());
}

function applyCss(map: SubjectColorMap) {
  let style = document.getElementById(SUBJECT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = SUBJECT_STYLE_ID;
    document.head.appendChild(style);
  }
  const css = subjectColorsCss(map);
  if (style.textContent !== css) style.textContent = css;
}

/** Donne une couleur aux matières qui n'en ont pas encore (sans toucher aux autres). */
export function registerSubjects(subjects: { key: string; name: string }[]) {
  const map = { ...getSubjectColors() };
  let changed = false;
  for (const { key, name } of subjects) {
    if (!key || map[key]) continue;
    map[key] = { color: nextSubjectColor(map), name };
    changed = true;
  }
  if (changed) save(map);
}

export function setSubjectColor(key: string, color: SubjectColor) {
  const map = getSubjectColors();
  if (!map[key] || map[key].color === color) return;
  save({ ...map, [key]: { ...map[key], color } });
}

export function subscribeSubjectColors(listener: () => void) {
  listeners.add(listener);
  // Un autre onglet a changé une couleur : on suit.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SUBJECT_COLORS_KEY) return;
    applyCss(getSubjectColors());
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSubjectColors(): SubjectColorMap {
  return useSyncExternalStore(subscribeSubjectColors, getSubjectColors, () => EMPTY);
}
