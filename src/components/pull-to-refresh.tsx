"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircleIcon, CheckIcon, RefreshCwIcon } from "@/components/icons";
import { useRefresh } from "@/lib/use-refresh";

/** Distance (après résistance) à dépasser pour déclencher l'actualisation. */
const THRESHOLD = 64;
/** Hauteur où l'écran reste suspendu pendant le chargement. */
const HOLD = 56;
/** Plafond de la résistance élastique : le contenu ne descend jamais plus bas. */
const MAX = 120;
/** Mouvement minimal avant de décider s'il s'agit d'un tirage vertical. */
const SLOP = 8;
const INDICATOR = 40;

/** Résistance élastique : suit le doigt au début, puis de moins en moins (comme iOS). */
/** Sans animation (préférence de l'appareil), il n'y a pas de remontée à attendre. */
const animatesBack = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rubber = (dy: number) => MAX * (1 - Math.exp(-dy / MAX));

/** Vrai si la cible est dans une zone qui défile verticalement et n'est pas tout en haut. */
function insideScrolledArea(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollTop > 0) return true;
  }
  return false;
}

/**
 * « Tirer pour actualiser » sur écran tactile : tout en haut de l'écran, on tire vers le bas,
 * on relâche au-delà du seuil, et les données sont redemandées à Pronote (même action que le
 * bouton Actualiser de l'ordinateur). C'est le geste attendu sur téléphone, y compris dans l'app
 * installée où le navigateur n'en propose pas.
 *
 * Le contenu suit le doigt avec une résistance élastique ; l'indicateur tourne avec la distance,
 * se colore une fois le seuil atteint (avec une petite vibration sur Android), tourne pendant le
 * chargement puis affiche une coche. Un geste horizontal (slider de période, listes) l'annule.
 * Sans effet avec une souris : le bouton de l'en-tête prend le relais.
 */
export function PullToRefresh({ className, children }: { className?: string; children: React.ReactNode }) {
  const { refresh, pending, status, announcement } = useRefresh();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Le contenu garde son décalage le temps de remonter, puis le perd : un transform permanent
  // casserait les éléments en position fixe des écrans.
  const [settling, setSettling] = useState(false);

  // Valeurs lues par les écouteurs tactiles sans les réabonner à chaque rendu.
  const gesture = useRef<{ x: number; y: number; mode: "undecided" | "pulling" | "ignored" } | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    busyRef.current = refreshing || pending;
  }, [refreshing, pending]);

  // Fin du chargement : l'écran remonte (après la coche, le temps de la voir).
  useEffect(() => {
    if (!refreshing || pending) return;
    const t = setTimeout(() => {
      setRefreshing(false);
      setSettling(animatesBack());
      setPull(0);
      pullRef.current = 0;
    }, status.kind === "done" ? 450 : 0);
    return () => clearTimeout(t);
  }, [refreshing, pending, status.kind]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");

    const onStart = (e: TouchEvent) => {
      gesture.current = null;
      if (!coarse.matches || busyRef.current || e.touches.length !== 1) return;
      if (window.scrollY > 0 || insideScrolledArea(e.target)) return;
      gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, mode: "undecided" };
    };

    const onMove = (e: TouchEvent) => {
      const g = gesture.current;
      if (!g || g.mode === "ignored") return;
      const dx = e.touches[0].clientX - g.x;
      const dy = e.touches[0].clientY - g.y;

      if (g.mode === "undecided") {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
          g.mode = "ignored";
          return;
        }
        g.mode = "pulling";
        setDragging(true);
      }

      if (e.cancelable) e.preventDefault(); // pas de défilement ni de rebond pendant le tirage
      const next = rubber(Math.max(0, dy - SLOP));
      if (pullRef.current < THRESHOLD && next >= THRESHOLD) navigator.vibrate?.(8);
      pullRef.current = next;
      setPull(next);
    };

    const onEnd = () => {
      const g = gesture.current;
      gesture.current = null;
      if (g?.mode !== "pulling") return;
      setDragging(false);
      if (pullRef.current >= THRESHOLD) {
        pullRef.current = HOLD;
        setPull(HOLD);
        setRefreshing(true);
        refreshRef.current();
      } else {
        pullRef.current = 0;
        setSettling(animatesBack());
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  const armed = pull >= THRESHOLD || refreshing;
  const showDone = refreshing && !pending && status.kind === "done";
  const motion = dragging ? "" : "transition-transform duration-300 ease-(--ease-spring) motion-reduce:transition-none";

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-20 flex justify-center ${motion}`}
        style={{ transform: `translateY(${pull / 2 - INDICATOR / 2}px)`, opacity: pull > 4 ? 1 : 0 }}
      >
        <span
          className={`grid size-10 place-items-center rounded-full border border-line bg-surface shadow-float transition-colors duration-150 ${
            armed ? "text-accent" : "text-ink-muted"
          }`}
        >
          {showDone ? (
            <CheckIcon size={20} strokeWidth={2.5} className="pop text-success" />
          ) : (
            <RefreshCwIcon
              size={20}
              className={pending ? "motion-safe:animate-spin" : undefined}
              style={pending ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
            />
          )}
        </span>
      </div>

      {status.kind === "error" && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-20 flex justify-center px-4 pointer-fine:hidden">
          <p className="flex animate-[rise_360ms_var(--ease-spring)_backwards] items-start gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-caption text-danger shadow-float">
            <AlertCircleIcon size={16} className="mt-px shrink-0" />
            {status.message}
          </p>
        </div>
      )}

      <span role="status" className="sr-only pointer-fine:hidden">
        {announcement}
      </span>

      <div
        className={`${className ?? ""} ${motion}`}
        style={pull > 0 || settling ? { transform: `translateY(${pull}px)` } : undefined}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && pull === 0) setSettling(false);
        }}
      >
        {children}
      </div>
    </>
  );
}
