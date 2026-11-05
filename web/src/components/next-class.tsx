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
    // Plus de cours aujourd'hui : encart neutre, l'accent est réservé à ce qui arrive maintenant.
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-line-strong"
      >
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-ink-muted">Fini pour aujourd&apos;hui</p>
          <p className="mt-0.5 truncate text-headline">
            {dayLabel(start, now)} {formatTime(next.start)} · {next.title}
          </p>
        </div>
        <ChevronRightIcon className="text-ink-muted" />
      </Link>
    );
  }

  const minutes = Math.ceil((start - now) / 60_000);
  const when =
    start <= now
      ? `En cours · jusqu'à ${formatTime(next.end)}`
      : minutes < 60
        ? `Prochain cours · dans ${minutes} min`
        : `Prochain cours · à ${formatTime(next.start)}`;

  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg bg-accent px-4 py-3 text-on-accent hover:opacity-95">
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium opacity-90">{when}</p>
        <p className="mt-0.5 truncate text-headline">{room ? `${next.title} · ${room}` : next.title}</p>
      </div>
      <div className="text-right font-mono text-caption font-medium tabular-nums">
        {formatTime(next.start)}
        <br />
        {formatTime(next.end)}
      </div>
      <ChevronRightIcon />
    </Link>
  );
}
