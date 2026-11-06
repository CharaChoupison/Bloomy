import type { GradeItem, GradeValue, SubjectAverage } from "@/lib/pronote/grades";
import { formatPoints, isNumeric, specialLabel, spokenGrade } from "@/lib/grades-format";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

// Pas de rouge / vert selon la note : on ne juge pas une note par une couleur.
// La comparaison avec la classe se lit en texte (et sur la réglette, point = toi, trait = classe).

/** Barre de couleur de la matière (couleur Pronote), avec un contour pour les couleurs très claires. */
export function SubjectBar({ color }: { color?: string }) {
  return (
    <div
      className="w-1 shrink-0 self-stretch rounded-full bg-line ring-1 ring-line ring-inset"
      style={color ? { backgroundColor: color } : undefined}
      aria-hidden
    />
  );
}

// Petits mots ignorés pour l'abréviation ("Sciences de la vie et de la Terre" → "ST").
const MINOR_WORDS = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "d", "l", "&"]);

/** "HISTOIRE-GEOGRAPHIE" → "HG", "MATHEMATIQUES" → "Ma". */
function subjectAbbr(name: string): string {
  const words = name
    .toLowerCase()
    .split(/[\s\-'’.]+/)
    .filter((w) => w && !MINOR_WORDS.has(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase() + (words[0].charAt(1) ?? "");
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/** Luminance relative WCAG d'une couleur "#rrggbb" (undefined si le format est inattendu). */
function luminance(hex: string): number | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pastille ronde de la matière (couleur Pronote + abréviation), comme l'icône d'une ligne de relevé.
 * Le texte passe en noir ou en blanc selon ce qui contraste le plus (toujours ≥ 4,5:1).
 * Décorative : le nom de la matière est écrit à côté.
 */
export function SubjectToken({ subject, color }: { subject: string; color?: string }) {
  const lum = color ? luminance(color) : undefined;
  const style =
    lum === undefined
      ? undefined
      : { backgroundColor: color, color: (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? "#000" : "#fff" };
  return (
    <span
      aria-hidden
      style={style}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-label font-bold text-ink-muted ring-1 ring-line ring-inset"
    >
      {subjectAbbr(subject)}
    </span>
  );
}

/** "14,5 /20", ou le mot du cas particulier ("Absent·e"). */
export function GradeFigure({ value, outOf, size = "md" }: { value?: GradeValue; outOf?: GradeValue; size?: "md" | "lg" }) {
  const points = formatPoints(value);
  const max = formatPoints(outOf);
  if (points === undefined) {
    return <span className="text-callout font-semibold text-ink-muted">{specialLabel(value) ?? "—"}</span>;
  }
  return (
    <span className="tabular-nums whitespace-nowrap">
      <span className={size === "lg" ? "text-hero" : "text-headline"}>{points}</span>
      {max && <span className={size === "lg" ? "text-headline font-medium opacity-80" : "text-caption text-ink-muted"}> /{max}</span>}
    </span>
  );
}

/** Écart à la classe, en mots neutres : on situe, on ne juge pas (pas de vert / rouge). */
function classGap(me: GradeValue, cls?: GradeValue): string | undefined {
  if (!isNumeric(cls)) return undefined;
  const diff = Math.round((me.points - cls.points) * 100) / 100;
  if (diff === 0) return "Pile la moyenne de la classe";
  const pts = formatPoints({ kind: 0, points: Math.abs(diff) });
  return `${pts} pt${Math.abs(diff) >= 2 ? "s" : ""} ${diff > 0 ? "au-dessus" : "en dessous"} de la classe`;
}

/**
 * Moyenne générale de la période : le chiffre clé de l'écran Notes, en carte « hero ».
 * Réglette 0–20 : point = toi, trait = classe (visuelle, les mêmes infos sont écrites).
 */
export function OverallCard({
  overall,
  classOverall,
  period,
}: {
  overall?: GradeValue;
  classOverall?: GradeValue;
  period?: string;
}) {
  if (!isNumeric(overall)) return null;
  const cls = formatPoints(classOverall);
  const gap = classGap(overall, classOverall);
  const pct = (v: GradeValue) => Math.min(100, Math.max(0, (v.points / 20) * 100));

  return (
    <section aria-label="Moyenne générale" className="card-hero px-5 py-5">
      <p className="text-callout font-medium opacity-90">Moyenne générale{period && ` · ${period}`}</p>
      <p className="mt-2" aria-label={spokenGrade(overall, { kind: 0, points: 20 })}>
        <GradeFigure value={overall} outOf={{ kind: 0, points: 20 }} size="lg" />
      </p>
      <div className="relative mt-5 h-3" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-current/25" />
        <div
          className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-current"
          style={{ width: `${pct(overall)}%` }}
        />
        {isNumeric(classOverall) && (
          <div
            className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded-full bg-current opacity-70"
            style={{ left: `${pct(classOverall)}%` }}
          />
        )}
      </div>
      {(cls || gap) && (
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-caption font-medium opacity-90">
          {cls && <span>Classe {cls}</span>}
          {gap && <span>{gap}</span>}
        </p>
      )}
    </section>
  );
}

export function GradeRow({ g }: { g: GradeItem }) {
  const cls = formatPoints(g.classAverage);
  const special = specialLabel(g.value);
  const showSpecialBadge = special && isNumeric(g.value); // "Absent·e" compté 0 : on montre le 0 et le mot
  const hasBadges = showSpecialBadge || g.coefficient !== 1 || g.isBonus || g.isOptional;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{g.subject}</p>
        <p className="mt-0.5 truncate text-caption text-ink-muted">
          {formatShortDate(g.date)}
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
        <p className="card px-4 py-3 text-callout text-ink-muted">
          Aucune note pour cette période.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden card">
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
    <li className="flex items-start gap-3 px-4 py-3">
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
      <ul className="divide-y divide-line overflow-hidden card">
        {subjects.map((s) => (
          <SubjectRow key={s.subjectId} s={s} />
        ))}
      </ul>
    </section>
  );
}
