import type { ClassItem, DayTimetable } from "@/lib/pronote/timetable";
import { formatDay, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

function ClassRow({ c, columns }: { c: ClassItem; columns: boolean }) {
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
      {/* Couleur de matière fournie par Pronote : simple repère, jamais derrière du texte.
          Le contour garde visibles les couleurs très claires (blanc, gris) sur une carte blanche. */}
      <div
        className="w-1 shrink-0 rounded-full bg-line ring-1 ring-line ring-inset"
        style={c.color ? { backgroundColor: c.color } : undefined}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {/* Vue en colonnes (Semaine sur ordinateur) : l'horaire passe au-dessus pour laisser la largeur au nom. */}
        {columns && (
          <p className="mb-0.5 hidden font-mono text-caption font-medium tabular-nums lg:block">
            {formatTime(c.start)} <span className="text-ink-muted">– {formatTime(c.end)}</span>
          </p>
        )}
        <p className={`text-body font-semibold ${c.canceled ? "text-ink-muted line-through" : ""}`}>
          {c.kind === "detention" ? `Retenue · ${c.title}` : c.title}
        </p>
        {details && <p className="mt-0.5 truncate text-caption text-ink-muted">{details}</p>}
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

export function DayCard({
  day,
  isToday,
  title,
  columns = false,
}: {
  day: DayTimetable;
  isToday: boolean;
  title?: string;
  /** La carte devient une colonne étroite à partir de 1024px (vue Semaine). */
  columns?: boolean;
}) {
  const label = title ?? formatDay(day.date);
  return (
    <section
      className={`overflow-hidden rounded-lg border bg-surface ${isToday ? "border-accent" : "border-line"}`}
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
          {day.classes.map((c) => (
            <ClassRow key={c.id} c={c} columns={columns} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function DayCardSkeleton() {
  return <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />;
}
