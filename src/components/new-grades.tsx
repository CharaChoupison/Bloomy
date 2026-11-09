"use client";

import { useEffect, useRef } from "react";
import { countNewGrades, isNewGrade, type GradeStamp } from "@/lib/new-grades";
import { markGradesSeen, rememberKnownGrades, useKnownGrades, useSeenGrades } from "@/lib/new-grades-client";

/**
 * Mention « Nouveau » si au moins une de ces notes n'a pas encore été vue dans l'écran Notes.
 * Rien au rendu serveur : la mémoire des notes vues est dans le navigateur.
 */
export function NewGradeLabel({ grades, label = "Nouveau" }: { grades: readonly GradeStamp[]; label?: string }) {
  const seen = useSeenGrades();
  if (seen === undefined || !grades.some((g) => isNewGrade(g, seen))) return null;
  return (
    <span className="font-semibold text-(--subject,var(--accent))">
      {label}
    </span>
  );
}

/**
 * Suit les notes affichées :
 * - `current` : notes de la période en cours, retenues pour la pastille de l'onglet Notes ;
 * - `markSeen` : écran Notes. Les notes sont marquées vues en quittant l'écran (ou l'app), pas à
 *   l'arrivée : les mentions « Nouveau » restent affichées pendant qu'on les lit.
 */
export function GradesSeenTracker({
  grades,
  current = false,
  markSeen = false,
}: {
  grades: readonly GradeStamp[];
  current?: boolean;
  markSeen?: boolean;
}) {
  const latest = useRef(grades);
  useEffect(() => {
    latest.current = grades;
    if (current) rememberKnownGrades(grades);
  }, [grades, current]);

  useEffect(() => {
    if (!markSeen) return;
    const flush = () => markGradesSeen(latest.current.map((g) => g.id));
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush(); // changement d'écran
    };
  }, [markSeen]);

  return null;
}

/** Pastille sur l'onglet Notes quand des notes de la période en cours n'ont pas été vues. */
export function NewGradesDot({ className = "" }: { className?: string }) {
  const known = useKnownGrades();
  const seen = useSeenGrades();
  const count = seen === undefined ? 0 : countNewGrades(known, seen);
  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden
        className={`size-2.5 rounded-full bg-accent ring-2 ring-surface motion-safe:animate-[pop_320ms_var(--ease-bounce)_both] ${className}`}
      />
      <span className="sr-only">
        , {count} nouvelle{count > 1 ? "s" : ""} note{count > 1 ? "s" : ""}
      </span>
    </>
  );
}
