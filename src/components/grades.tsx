import type { GradeItem, GradeValue } from "@/lib/pronote/grades";
import { formatPoints, isNumeric, specialLabel, spokenGrade } from "@/lib/grades-format";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { subjectKey } from "@/lib/subject-colors";

// Pas de rouge / vert selon la note : on ne juge pas une note par une couleur.
// La comparaison avec la classe se lit en texte (et sur la réglette, point = toi, trait = classe).

/**
 * Barre de couleur de la matière : couleur Bloomy de la matière (voir lib/subject-colors.ts),
 * gris neutre le temps qu'elle en reçoive une. Décorative : le nom de la matière est écrit à côté.
 */
export function SubjectBar({ subject, className = "self-stretch" }: { subject?: string; className?: string }) {
  const key = subject ? subjectKey(subject) : "";
  return (
    <div
      data-subject={key || undefined}
      data-subject-name={key ? subject : undefined}
      className={`w-1 shrink-0 rounded-full bg-(--subject,var(--line)) transition-colors duration-200 ${className}`}
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

/**
 * Pastille ronde de la matière (abréviation), comme l'icône d'une ligne de relevé : fond doux et
 * texte dans la couleur de la matière (≥ 4,5:1 dans les deux thèmes). Décorative : le nom est écrit à côté.
 */
export function SubjectToken({ subject }: { subject: string }) {
  return (
    <span
      aria-hidden
      data-subject={subjectKey(subject)}
      data-subject-name={subject}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-(--subject-soft,var(--surface-sunken)) text-label font-bold text-(--subject,var(--ink-muted)) transition-colors duration-200"
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
    <section aria-label="Moyenne générale" className="card-hero px-5 py-4">
      <p className="text-callout font-medium opacity-90">Moyenne générale{period && ` · ${period}`}</p>
      <p className="mt-2" aria-label={spokenGrade(overall, { kind: 0, points: 20 })}>
        <GradeFigure value={overall} outOf={{ kind: 0, points: 20 }} size="lg" />
      </p>
      <div className="relative mt-4 h-3" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-current/25" />
        <div
          className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-current grow-x"
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
