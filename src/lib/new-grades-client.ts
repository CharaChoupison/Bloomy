"use client";

import { useSyncExternalStore } from "react";
import { mergeSeen, parseIds, parseStamps, type GradeStamp } from "./new-grades";

// Mémoire des notes vues, propre à l'appareil (localStorage) : rien n'est envoyé au serveur.
// - SEEN : identifiants des notes déjà vues dans l'écran Notes ;
// - KNOWN : les dernières notes connues (période en cours), pour la pastille de l'onglet Notes.
// « -v2 » : identifiants stables (lib/grade-key.ts) ; les anciennes listes, aux identifiants
// Pronote, ne correspondent plus à rien et sont abandonnées (retour à la règle de la date).
const SEEN_KEY = "bloomy:grades-seen-v2";
const KNOWN_KEY = "bloomy:grades-known-v2";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // stockage bloqué : on retombe sur la règle de la date
  }
}

function write(key: string, value: string) {
  try {
    if (localStorage.getItem(key) === value) return;
    localStorage.setItem(key, value);
  } catch {
    return;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SEEN_KEY || e.key === KNOWN_KEY) listener();
  };
  window.addEventListener("storage", onStorage); // autre onglet
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Instantanés : la chaîne brute du stockage (valeur stable tant qu'elle ne change pas).
// Côté serveur, « inconnu » : les marques « Nouveau » n'apparaissent qu'une fois dans le navigateur.
const SERVER = "\u0000server";
const useRaw = (key: string) =>
  useSyncExternalStore(subscribe, () => read(key), () => SERVER);

let seenCache: { raw: string | null; set: ReadonlySet<string> | null } = { raw: null, set: null };
function seenSet(raw: string | null): ReadonlySet<string> | null {
  if (seenCache.raw !== raw) {
    const ids = parseIds(raw);
    seenCache = { raw, set: ids ? new Set(ids) : null };
  }
  return seenCache.set;
}

let knownCache: { raw: string | null; list: GradeStamp[] } = { raw: null, list: [] };
function knownList(raw: string | null): GradeStamp[] {
  if (knownCache.raw !== raw) knownCache = { raw, list: parseStamps(raw) };
  return knownCache.list;
}

/** Notes vues : `undefined` pendant le rendu serveur et l'hydratation, `null` sans historique. */
export function useSeenGrades(): ReadonlySet<string> | null | undefined {
  const raw = useRaw(SEEN_KEY);
  return raw === SERVER ? undefined : seenSet(raw);
}

/** Dernières notes connues sur cet appareil (pour la pastille de l'onglet). */
export function useKnownGrades(): GradeStamp[] {
  const raw = useRaw(KNOWN_KEY);
  return raw === SERVER ? [] : knownList(raw);
}

/** Retient les dernières notes affichées, pour la pastille de l'onglet Notes. */
export function rememberKnownGrades(grades: readonly GradeStamp[]) {
  write(KNOWN_KEY, JSON.stringify(grades.map(({ id, date }) => ({ id, date }))));
}

/** Marque des notes comme vues. */
export function markGradesSeen(ids: readonly string[]) {
  if (ids.length === 0) return;
  write(SEEN_KEY, JSON.stringify(mergeSeen(parseIds(read(SEEN_KEY)), ids)));
}
