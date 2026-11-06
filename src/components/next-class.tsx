"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { ClassItem } from "@/lib/pronote/timetable";
import { formatTime } from "@/lib/format";
import { ChevronRightIcon } from "@/components/icons";

export type UpcomingClass = ClassItem & { weekOffset: number };

// Horloge partagée, rafraîchie toutes les 30 s : le délai « dans 12 min » reste juste
// sans recharger la page. Côté serveur (et à l'hydratation), on part de l'heure du rendu.
let clock = Date.now();
function subscribeClock(onChange: () => void) {
  clock = Date.now();
  const id = window.setInterval(() => {
    clock = Date.now();
    onChange();
  }, 30_000);
  return () => window.clearInterval(id);
}

const dayKey = (t: number) => new Date(t).toDateString();
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });

function dayLabel(start: number, now: number): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayKey(start) === dayKey(tomorrow.getTime())) return "Demain";
  const s = weekdayFmt.format(start);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Encart « Prochain cours » de l'Accueil.
 * `classes` : cours à venir non annulés, triés (ceux de la semaine suivante ont weekOffset = 1).
 */
export function NextClass({ classes, serverNow }: { classes: UpcomingClass[]; serverNow: number }) {
  const now = useSyncExternalStore(subscribeClock, () => clock, () => serverNow);
  const next = classes.find((c) => Date.parse(c.end) > now);
  if (!next) return null;

  const start = Date.parse(next.start);
  const room = next.rooms.join(", ");
  const href = next.weekOffset ? `/semaine?semaine=${next.weekOffset}` : "/semaine";

  if (dayKey(start) !== dayKey(now)) {
    // Plus de cours aujourd'hui : même gabarit, mais neutre — l'accent est réservé à ce qui arrive maintenant.
    return (
      <Link href={href} className="flex items-center gap-4 card px-5 py-5 transition-colors hover:bg-bg">
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium text-ink-muted">Fini pour aujourd&apos;hui · {dayLabel(start, now)}</p>
          <p className="mt-2 text-hero tabular-nums">{formatTime(next.start)}</p>
          <p className="mt-2 truncate text-headline">{room ? `${next.title} · ${room}` : next.title}</p>
        </div>
        <ChevronRightIcon className="text-ink-muted" />
      </Link>
    );
  }

  const ongoing = start <= now;
  const end = Date.parse(next.end);
  // L'horaire complet est écrit en grand : le libellé donne seulement le délai.
  const minutes = Math.ceil(((ongoing ? end : start) - now) / 60_000);
  const when = ongoing
    ? `En cours · encore ${minutes} min`
    : minutes < 60
      ? `Prochain cours · dans ${minutes} min`
      : "Prochain cours";
  // Avancement du cours en cours (repère visuel ; le temps restant est écrit au-dessus).
  const progress = ongoing ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;

  return (
    <Link
      href={href}
      className="flex flex-col gap-4 card-hero px-5 py-5 transition-[filter] duration-[120ms] hover:brightness-105"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium opacity-90">{when}</p>
          <p className="mt-2 text-hero tabular-nums">
            {formatTime(next.start)}
            <span className="text-headline font-medium opacity-80"> – {formatTime(next.end)}</span>
          </p>
          <p className="mt-2 truncate text-headline">{next.title}</p>
          {room && <p className="truncate text-callout opacity-90">{room}</p>}
        </div>
        <ChevronRightIcon className="mt-0.5 shrink-0" />
      </div>
      {ongoing && (
        <div className="h-1.5 overflow-hidden rounded-full bg-current/25" aria-hidden>
          <div className="h-full rounded-full bg-current" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  );
}
