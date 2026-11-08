import type { ClassItem, DayTimetable } from "@/lib/pronote/timetable";
import { formatDay, formatShortDay, formatTime } from "@/lib/format";
import Link from "next/link";
import { lessonAnchor, lessonContentHref } from "@/lib/lesson-anchor";
import { BookOpenIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SubjectBar } from "@/components/grades";
import { withBreaks, type DayEntry } from "@/lib/timetable-layout";

function ClassRow({
  c,
  columns,
  dayKey,
  contentStart,
}: {
  c: ClassItem;
  columns: boolean;
  dayKey: string;
  /** Début de la (première) séance du bloc qui a un contenu de cours, s'il y en a une. */
  contentStart?: string;
}) {
  const details = [c.teachers.join(", "), c.rooms.join(", ")].filter(Boolean).join(" · ");
  // On n'affiche pas deux fois l'annulation (badge « Annulé » + statut Pronote « Cours annulé »).
  const status = c.status && !(c.canceled && /annul/i.test(c.status)) ? c.status : undefined;
  const hasBadges = c.canceled || status || c.test || c.exempted;

  return (
    <li className={`flex gap-3 px-4 py-3 ${c.canceled ? "bg-danger-soft/50" : ""}`}>
      <div
        className={`w-11 shrink-0 pt-0.5 text-right font-mono text-caption font-medium tabular-nums ${columns ? "lg:hidden" : ""}`}
      >
        <div>{formatTime(c.start)}</div>
        <div className="text-ink-muted">{formatTime(c.end)}</div>
      </div>
      {/* Couleur de la matière : simple repère, jamais derrière du texte. Retenues et activités restent neutres. */}
      <SubjectBar subject={c.kind === "lesson" ? c.title : undefined} className="" />
      <div className="min-w-0 flex-1">
        {/* Vue en colonnes (Calendrier sur ordinateur) : l'horaire passe au-dessus pour laisser la largeur au nom. */}
        {columns && (
          <p className="mb-0.5 hidden font-mono text-caption font-medium tabular-nums lg:block">
            {formatTime(c.start)} <span className="text-ink-muted">– {formatTime(c.end)}</span>
          </p>
        )}
        <p className={`text-body font-semibold ${c.canceled ? "text-ink-muted line-through" : ""}`}>
          {c.kind === "detention" ? `Retenue · ${c.title}` : c.title}
        </p>
        {details && <p className="mt-0.5 truncate text-caption text-ink-muted">{details}</p>}
        {contentStart && !c.canceled && (
          <Link
            href={lessonContentHref(dayKey, contentStart)}
            className="mt-1 inline-flex min-h-6 items-center gap-1 rounded-sm text-caption font-medium text-accent underline-offset-2 hover:underline"
          >
            <BookOpenIcon size={14} />
            Contenu du cours
          </Link>
        )}
        {hasBadges && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.canceled && <Badge tone="danger">Annulé</Badge>}
            {status && <Badge tone="warn">{status}</Badge>}
            {c.test && <Badge tone="test">Contrôle</Badge>}
            {c.exempted && <Badge tone="neutral">Dispensé·e</Badge>}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Pause entre deux cours : ligne basse et discrète, sans barre de matière, pour que la journée
 * se lise d'un coup d'œil (trou du midi, interclasse). La durée est écrite, pas seulement suggérée.
 */
function BreakRow({ entry, columns }: { entry: Extract<DayEntry, { type: "break" }>; columns: boolean }) {
  return (
    <li className={`flex items-center gap-3 bg-bg/60 px-4 ${entry.lunch ? "py-2.5" : "py-1.5"}`}>
      <div className={`w-11 shrink-0 ${columns ? "lg:hidden" : ""}`} aria-hidden />
      <div className="w-1 shrink-0 self-stretch border-l-2 border-dotted border-line-strong/60" aria-hidden />
      <p className="min-w-0 flex-1 text-caption text-ink-muted">
        <span className={entry.lunch ? "font-semibold text-ink" : "font-medium"}>
          {entry.lunch ? "Pause déjeuner" : "Pause"}
        </span>
        {" · "}
        <span className="tabular-nums">{entry.duration}</span>
        <span className="sr-only">
          {", de "}
          {formatTime(entry.start)} à {formatTime(entry.end)}
        </span>
      </p>
    </li>
  );
}

export function DayCard({
  day,
  isToday,
  title,
  columns = false,
  contentAnchors,
}: {
  day: DayTimetable;
  isToday: boolean;
  title?: string;
  /** La carte devient une colonne étroite à partir de 1024px (Calendrier). */
  columns?: boolean;
  /**
   * Ancres des séances qui ont un contenu de cours (voir lib/lesson-anchor.ts) : ces séances
   * affichent un lien « Contenu du cours ». On rapproche par l'heure de début, car Pronote
   * ne renseigne pas toujours le lien depuis l'emploi du temps.
   */
  contentAnchors?: ReadonlySet<string>;
}) {
  const label = title ?? formatDay(day.date);
  return (
    <section
      className={`overflow-hidden card ${isToday ? "outline-2 -outline-offset-2 outline-accent" : ""}`}
      aria-label={label}
    >
      <h2
        className={`flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-callout font-semibold ${
          isToday ? "bg-accent-soft" : ""
        }`}
      >
        {label}
        {isToday && <span className="text-label text-accent">Aujourd&apos;hui</span>}
      </h2>
      {day.classes.length === 0 ? (
        <p className="px-4 py-3 text-callout text-ink-muted">Pas de cours</p>
      ) : (
        <ul className="divide-y divide-line">
          {withBreaks(day.classes).map((entry) =>
            entry.type === "break" ? (
              <BreakRow key={entry.key} entry={entry} columns={columns} />
            ) : (
              <ClassRow
                key={entry.item.id}
                c={entry.item}
                columns={columns}
                dayKey={day.date}
                contentStart={(entry.item.sessionStarts ?? [entry.item.start]).find((start) =>
                  contentAnchors?.has(lessonAnchor(start)),
                )}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Jours consécutifs sans cours, regroupés en une seule carte compacte : ils ne prennent plus la
 * largeur d'une journée pleine (vue en colonnes) ni la hauteur d'une carte chacun (téléphone).
 * Chaque jour reste nommé pour que l'on sache lesquels sont libres.
 */
export function FreeDaysCard({ days, today }: { days: readonly DayTimetable[]; today: string | null }) {
  const label =
    days.length === 1 ? formatDay(days[0].date) : `${formatDay(days[0].date)} – ${formatDay(days.at(-1)!.date)}`;
  return (
    <section className="overflow-hidden card" aria-label={`${label} : pas de cours`}>
      <ul className="divide-y divide-line">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <li
              key={day.date}
              className={`flex items-baseline justify-between gap-2 px-4 py-2.5 lg:flex-col lg:gap-0 ${
                isToday ? "bg-accent-soft" : ""
              }`}
            >
              <span className="text-callout font-semibold">
                {formatShortDay(day.date)}
                {isToday && <span className="sr-only"> (aujourd&apos;hui)</span>}
              </span>
              <span className={`text-caption ${isToday ? "font-medium text-accent" : "text-ink-muted"}`}>
                {isToday ? "Aujourd'hui · libre" : "Pas de cours"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DayCardSkeleton() {
  return <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />;
}
