"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { ClassItem } from "@/lib/pronote/timetable";
import { formatTime } from "@/lib/format";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";
import { ChevronRightIcon } from "@/components/icons";
import { SubjectBar } from "@/components/grades";
import { calmShouting } from "@/lib/text-case";

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

// Jours comparés dans le fuseau de l'établissement, comme les heures affichées.
const dayKeyFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: SCHOOL_TIME_ZONE }); // "2026-11-06"
const dayKey = (t: number) => dayKeyFmt.format(t);
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: SCHOOL_TIME_ZONE });

function dayLabel(start: number, now: number): string {
  // Lendemain calculé sur le calendrier (pas « +24 h », faux les jours de changement d'heure).
  const [y, m, d] = dayKey(now).split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (dayKey(start) === tomorrow) return "Demain";
  const s = weekdayFmt.format(start);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « Data science · 06 ETAGE 1 », nom de matière en casse normale. */
const titleOf = (c: ClassItem) => calmShouting(c.title);

/**
 * Encart « Prochain cours » de l'Accueil, suivi des cours qui viennent juste après.
 * `classes` : cours à venir non annulés, triés et fusionnés (ceux de la semaine suivante ont weekOffset = 1).
 * `hadClassesToday` : il y avait cours aujourd'hui (« Journée terminée » plutôt que « Pas de cours »).
 */
export function NextClass({
  classes,
  serverNow,
  hadClassesToday,
}: {
  classes: UpcomingClass[];
  serverNow: number;
  hadClassesToday: boolean;
}) {
  const now = useSyncExternalStore(subscribeClock, () => clock, () => serverNow);
  const index = classes.findIndex((c) => Date.parse(c.end) > now);
  const next = classes[index];
  if (!next) return null;

  const start = Date.parse(next.start);
  const room = next.rooms.join(", ");
  const href = next.weekOffset ? `/semaine?semaine=${next.weekOffset}` : "/semaine";
  const isToday = dayKey(start) === dayKey(now);
  // La suite : les cours du même jour que le prochain, après lui.
  const later = classes.slice(index + 1).filter((c) => dayKey(Date.parse(c.start)) === dayKey(start));

  return (
    <div className="flex flex-col gap-3">
      {isToday ? <TodayHero next={next} now={now} href={href} /> : <LaterHero next={next} now={now} href={href} room={room} hadClassesToday={hadClassesToday} />}
      {later.length > 0 && <UpNext classes={later} label={isToday ? "Ensuite" : `Ensuite ${dayLabel(start, now).toLowerCase()}`} href={href} />}
    </div>
  );
}

/** Plus de cours aujourd'hui : la phrase d'abord, puis le prochain cours. Neutre : l'accent est pour « maintenant ». */
function LaterHero({
  next,
  now,
  href,
  room,
  hadClassesToday,
}: {
  next: UpcomingClass;
  now: number;
  href: string;
  room: string;
  hadClassesToday: boolean;
}) {
  const start = Date.parse(next.start);
  return (
    <Link href={href} className="flex items-center gap-4 card px-5 py-4 pressable hover:bg-bg">
      <div className="min-w-0 flex-1">
        <p className="text-title">{hadClassesToday ? "Journée terminée" : "Pas de cours aujourd\u2019hui"}</p>
        <p className="mt-1 text-callout text-ink-muted">
          Prochain cours <span className="font-semibold text-ink">{dayLabel(start, now).toLowerCase()} à {formatTime(next.start)}</span>
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-callout">
          <SubjectBar subject={next.kind === "lesson" ? next.title : undefined} className="h-4" />
          <span className="truncate">{room ? `${titleOf(next)} · ${room}` : titleOf(next)}</span>
        </div>
      </div>
      <ChevronRightIcon className="shrink-0 text-ink-muted" />
    </Link>
  );
}

/** Cours en cours, ou prochain cours aujourd'hui : en carte accent, avec le délai. */
function TodayHero({ next, now, href }: { next: UpcomingClass; now: number; href: string }) {
  const start = Date.parse(next.start);
  const room = next.rooms.join(", ");
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
    <Link href={href} className="flex flex-col gap-4 card-hero px-5 py-5 pressable hover:brightness-105">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium opacity-90">{when}</p>
          <p className="mt-2 text-hero tabular-nums">
            {formatTime(next.start)}
            <span className="text-headline font-medium opacity-80"> – {formatTime(next.end)}</span>
          </p>
          <p className="mt-2 truncate text-headline">{titleOf(next)}</p>
          {room && <p className="truncate text-callout opacity-90">{room}</p>}
        </div>
        <ChevronRightIcon className="mt-0.5 shrink-0" />
      </div>
      {ongoing && (
        <div className="h-1.5 overflow-hidden rounded-full bg-current/25" aria-hidden>
          <div className="h-full rounded-full bg-current transition-[width] duration-700 ease-(--ease-spring)" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  );
}

const MAX_LATER = 3;

/** Les cours suivants de la journée, en lignes compactes ; le reste est dans le Calendrier. */
function UpNext({ classes, label, href }: { classes: UpcomingClass[]; label: string; href: string }) {
  const shown = classes.slice(0, MAX_LATER);
  const hidden = classes.length - shown.length;
  return (
    <section aria-label={label} className="overflow-hidden card">
      <h3 className="px-4 pt-3 pb-1 text-label text-ink-muted">{label}</h3>
      <ul>
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2">
            <span className="w-11 shrink-0 font-mono text-caption font-medium tabular-nums">{formatTime(c.start)}</span>
            <SubjectBar subject={c.kind === "lesson" ? c.title : undefined} className="h-8" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-callout font-semibold">{titleOf(c)}</span>
              {c.rooms.length > 0 && <span className="block truncate text-caption text-ink-muted">{c.rooms.join(", ")}</span>}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="flex min-h-touch items-center justify-between gap-2 border-t border-line px-4 text-callout font-medium text-accent hover:bg-bg"
      >
        {hidden > 0 ? `Voir toute la journée · ${hidden} autre${hidden > 1 ? "s" : ""}` : "Voir toute la journée"}
        <ChevronRightIcon size={16} />
      </Link>
    </section>
  );
}
