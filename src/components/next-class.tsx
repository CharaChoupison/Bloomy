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
  const href = next.weekOffset ? `/semaine?semaine=${next.weekOffset}` : "/semaine";
  const isToday = dayKey(start) === dayKey(now);
  // Les cours du même jour que le prochain, à partir de lui.
  const sameDay = classes.slice(index).filter((c) => dayKey(Date.parse(c.start)) === dayKey(start));

  if (!isToday) {
    // Plus de cours aujourd'hui : une seule carte pour le prochain jour, qui commence par son premier cours
    // (séparer le premier cours du reste faisait croire que la journée commençait au deuxième).
    return <NextDayCard classes={sameDay} now={now} href={href} hadClassesToday={hadClassesToday} />;
  }

  // Cours aujourd'hui : la carte accent (heure en grand), puis la suite.
  const later = sameDay.slice(1);
  return (
    <div className="flex flex-col gap-3">
      <TodayHero next={next} now={now} href={href} />
      {later.length > 0 && (
        <section aria-label="Ensuite" className="overflow-hidden card">
          <h3 className="px-4 pt-3 pb-1 text-label text-ink-muted">Ensuite</h3>
          <ClassLines classes={later} href={href} />
        </section>
      )}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: SCHOOL_TIME_ZONE });

/**
 * Plus de cours aujourd'hui : la phrase d'abord, puis le prochain jour de cours en entier (résumé + premiers cours).
 * Neutre : l'accent est réservé à ce qui se passe aujourd'hui.
 */
function NextDayCard({
  classes,
  now,
  href,
  hadClassesToday,
}: {
  classes: UpcomingClass[];
  now: number;
  href: string;
  hadClassesToday: boolean;
}) {
  const first = classes[0];
  const last = classes[classes.length - 1];
  const start = Date.parse(first.start);
  const label = dayLabel(start, now);
  const date = dateFmt.format(start);
  // « Jeudi 12 novembre », ou « Demain · jeudi 12 novembre ».
  const when = label === "Demain" ? `Demain · ${date}` : date.charAt(0).toUpperCase() + date.slice(1);

  return (
    <section aria-labelledby="prochain-jour" className="overflow-hidden card">
      <div className="px-4 pt-4 pb-2">
        <p className="text-title">{hadClassesToday ? "Journée terminée" : "Pas de cours aujourd\u2019hui"}</p>
        <h3 id="prochain-jour" className="mt-1 text-callout text-ink-muted">
          <span className="font-semibold text-ink">{when}</span>
          {` · ${classes.length} cours, de ${formatTime(first.start)} à ${formatTime(last.end)}`}
        </h3>
      </div>
      <ClassLines classes={classes} href={href} />
    </section>
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

const MAX_LINES = 3;

/** Lignes compactes (heure, couleur, matière, salle) puis lien vers la journée complète du Calendrier. */
function ClassLines({ classes, href }: { classes: UpcomingClass[]; href: string }) {
  const shown = classes.slice(0, MAX_LINES);
  const hidden = classes.length - shown.length;
  return (
    <>
      <ul className="pb-1">
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
    </>
  );
}
