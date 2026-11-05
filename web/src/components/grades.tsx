import type { GradeItem, GradeValue, SubjectAverage } from "@/lib/pronote/grades";
import { formatGradeDate, formatPoints, isNumeric, specialLabel, spokenGrade } from "@/lib/grades-format";
import { Badge } from "@/components/ui/badge";

// Pas de rouge / vert selon la note : on ne juge pas une note par une couleur.
// La comparaison avec la classe se lit en texte (et sur la réglette, point = toi, trait = classe).

/** Barre de couleur de la matière (couleur Pronote), avec un contour pour les couleurs très claires. */
function SubjectBar({ color }: { color?: string }) {
  return (
    <div
      className="w-1 shrink-0 self-stretch rounded-full bg-line ring-1 ring-line ring-inset"
      style={color ? { backgroundColor: color } : undefined}
      aria-hidden
    />
  );
}

/** "14,5 /20", ou le mot du cas particulier ("Absent·e"). */
function GradeFigure({ value, outOf, size = "md" }: { value?: GradeValue; outOf?: GradeValue; size?: "md" | "lg" }) {
  const points = formatPoints(value);
  const max = formatPoints(outOf);
  if (points === undefined) {
    return <span className="text-callout font-semibold text-ink-muted">{specialLabel(value) ?? "—"}</span>;
  }
  return (
    <span className="font-mono font-medium tabular-nums whitespace-nowrap">
      <span className={size === "lg" ? "text-[1.75rem] leading-none" : "text-headline"}>{points}</span>
      {max && <span className="text-caption text-ink-muted"> /{max}</span>}
    </span>
  );
}

/** Moyenne générale de la période, avec celle de la classe. */
export function OverallCard({ overall, classOverall }: { overall?: GradeValue; classOverall?: GradeValue }) {
  if (!isNumeric(overall)) return null;
  const cls = formatPoints(classOverall);
  return (
    <section aria-label="Moyenne générale" className="rounded-lg border border-line bg-surface px-4 py-4">
      <p className="text-callout font-medium text-ink-muted">Moyenne générale</p>
      <p className="mt-1" aria-label={spokenGrade(overall, { kind: 0, points: 20 })}>
        <GradeFigure value={overall} outOf={{ kind: 0, points: 20 }} size="lg" />
      </p>
      {cls && <p className="mt-1 text-caption text-ink-muted">Classe {cls}</p>}
    </section>
  );
}

function GradeRow({ g }: { g: GradeItem }) {
  const cls = formatPoints(g.classAverage);
  const special = specialLabel(g.value);
  const showSpecialBadge = special && isNumeric(g.value); // "Absent·e" compté 0 : on montre le 0 et le mot
  const hasBadges = showSpecialBadge || g.coefficient !== 1 || g.isBonus || g.isOptional;

  return (
    <li className="flex gap-3 px-4 py-3">
      <SubjectBar color={g.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{g.subject}</p>
        <p className="mt-0.5 truncate text-caption text-ink-muted">
          {formatGradeDate(g.date)}
          {g.comment && ` · ${g.comment}`}
        </p>
        {hasBadges && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {showSpecialBadge && <Badge tone="neutral">{special}</Badge>}
            {g.coefficient !== 1 && <Badge tone="neutral">Coef. {formatPoints({ kind: 0, points: g.coefficient })}</Badge>}
            {g.isBonus && <Badge tone="neutral">Bonus</Badge>}
            {g.isOptional && <Badge tone="neutral">Facultative</Badge>}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p aria-label={spokenGrade(g.value, g.outOf)}>
          <GradeFigure value={g.value} outOf={g.outOf} />
        </p>
        {cls && <p className="mt-0.5 text-caption text-ink-muted">Classe {cls}</p>}
      </div>
    </li>
  );
}

/** Dernières notes de la période, de la plus récente à la plus ancienne. */
export function LatestGrades({ grades }: { grades: GradeItem[] }) {
  return (
    <section aria-labelledby="dernieres-notes" className="flex flex-col gap-3">
      <h2 id="dernieres-notes" className="text-headline">
        Dernières notes
      </h2>
      {grades.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-callout text-ink-muted">
          Aucune note pour cette période.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {grades.map((g) => (
            <GradeRow key={g.id} g={g} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Réglette de 0 au barème : plage min–max de la classe, trait = moyenne de la classe, point = toi.
 * Purement visuelle (aria-hidden) : les mêmes infos sont écrites à côté.
 */
function RangeBar({ s }: { s: SubjectAverage }) {
  const scale = isNumeric(s.outOf) && s.outOf.points > 0 ? s.outOf.points : 20;
  const pct = (v?: GradeValue) => (isNumeric(v) ? Math.min(100, Math.max(0, (v.points / scale) * 100)) : undefined);
  const min = pct(s.min);
  const max = pct(s.max);
  const cls = pct(s.classAverage);
  const me = pct(s.student);
  if (me === undefined) return null;

  return (
    <div className="relative mt-2 h-3" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-sunken" />
      {min !== undefined && max !== undefined && (
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-strong/50"
          style={{ left: `${min}%`, width: `${Math.max(max - min, 1)}%` }}
        />
      )}
      {cls !== undefined && (
        <div className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded-full bg-ink-muted" style={{ left: `${cls}%` }} />
      )}
      <div
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-surface"
        style={{ left: `${me}%` }}
      />
    </div>
  );
}

function SubjectRow({ s }: { s: SubjectAverage }) {
  const cls = formatPoints(s.classAverage);
  const min = formatPoints(s.min);
  const max = formatPoints(s.max);
  const context = [cls && `Classe ${cls}`, min && max && `de ${min} à ${max}`].filter(Boolean).join(" · ");

  return (
    <li className="flex gap-3 px-4 py-3">
      <SubjectBar color={s.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-body font-semibold">{s.subject}</p>
          <p className="shrink-0" aria-label={spokenGrade(s.student, s.outOf)}>
            <GradeFigure value={s.student} outOf={s.outOf} />
          </p>
        </div>
        <RangeBar s={s} />
        {context && <p className="mt-1 text-caption text-ink-muted">{context}</p>}
      </div>
    </li>
  );
}

/** Moyennes par matière, dans l'ordre de Pronote. */
export function SubjectAverages({ subjects }: { subjects: SubjectAverage[] }) {
  if (subjects.length === 0) return null;
  return (
    <section aria-labelledby="moyennes" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="moyennes" className="text-headline">
          Moyennes par matière
        </h2>
        <p className="flex items-center gap-3 text-caption text-ink-muted" aria-hidden>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-ink" /> Toi
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-0.5 rounded-full bg-ink-muted" /> Classe
          </span>
        </p>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {subjects.map((s) => (
          <SubjectRow key={s.subjectId} s={s} />
        ))}
      </ul>
    </section>
  );
}
