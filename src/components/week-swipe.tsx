"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Mouvement minimal avant de décider s'il s'agit d'un balayage horizontal. */
const SLOP = 10;
/** Part de la largeur à parcourir pour changer de semaine… */
const DISTANCE_RATIO = 0.25;
/** …ou vitesse suffisante (px/ms) pour un geste rapide. */
const FLICK_SPEED = 0.5;

/** Vrai si la cible est dans une zone qui défile elle-même horizontalement. */
function insideHorizontalScroller(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el);
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/**
 * Calendrier : balayer vers la gauche pour la semaine suivante, vers la droite pour la précédente
 * (écran tactile). Les flèches restent là : le geste est un raccourci, pas le seul moyen.
 *
 * Le contenu suit le doigt ; au-delà d'un quart de l'écran (ou d'un geste vif), il part dans la
 * direction du geste pendant que la semaine suivante se charge. Un geste surtout vertical laisse
 * la page défiler normalement. À monter avec `key` = la semaine, pour repartir de zéro.
 */
export function WeekSwipe({
  prevHref,
  nextHref,
  className,
  children,
}: {
  prevHref: string;
  nextHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "dragging" | "leaving">("idle");
  const hrefs = useRef({ prevHref, nextHref });
  useEffect(() => {
    hrefs.current = { prevHref, nextHref };
  }, [prevHref, nextHref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const coarse = window.matchMedia("(pointer: coarse)");
    let g: { x: number; y: number; t: number; mode: "undecided" | "swiping" | "ignored" } | null = null;
    let last = 0;

    const onStart = (e: TouchEvent) => {
      g = null;
      if (!coarse.matches || e.touches.length !== 1 || insideHorizontalScroller(e.target)) return;
      g = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp, mode: "undecided" };
    };

    const onMove = (e: TouchEvent) => {
      if (!g || g.mode === "ignored") return;
      const mx = e.touches[0].clientX - g.x;
      const my = e.touches[0].clientY - g.y;
      if (g.mode === "undecided") {
        if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return;
        if (Math.abs(my) >= Math.abs(mx)) {
          g.mode = "ignored"; // défilement vertical : on laisse faire
          return;
        }
        g.mode = "swiping";
        setPhase("dragging");
      }
      if (e.cancelable) e.preventDefault();
      last = mx;
      setDx(mx);
    };

    const onEnd = (e: TouchEvent) => {
      const current = g;
      g = null;
      if (current?.mode !== "swiping") return;
      const speed = Math.abs(last) / Math.max(1, e.timeStamp - current.t);
      const far = Math.abs(last) > el.clientWidth * DISTANCE_RATIO || speed > FLICK_SPEED;
      if (!far) {
        setPhase("idle");
        setDx(0);
        return;
      }
      const forward = last < 0;
      setPhase("leaving");
      setDx(forward ? -el.clientWidth * 0.35 : el.clientWidth * 0.35);
      startTransition(() => router.push(forward ? hrefs.current.nextHref : hrefs.current.prevHref, { scroll: false }));
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const moving = phase !== "idle" || dx !== 0;
  return (
    <div
      ref={ref}
      className={`${className ?? ""} touch-pan-y touch-pinch-zoom ${
        phase === "dragging" ? "" : "transition-[transform,opacity] duration-300 ease-(--ease-spring) motion-reduce:transition-none"
      }`}
      style={
        moving
          ? { transform: `translateX(${dx}px)`, opacity: phase === "leaving" ? 0.3 : 1 - Math.min(0.4, Math.abs(dx) / 800) }
          : undefined
      }
    >
      {children}
    </div>
  );
}
