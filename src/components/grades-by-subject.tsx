import type { GradeItem, GradeValue, SubjectAverage } from "@/lib/pronote/grades";
import { formatPoints, isNumeric, specialLabel, spokenGrade } from "@/lib/grades-format";
import { formatShortDate } from "@/lib/format";
import { calmShouting } from "@/lib/text-case";
import { subjectKey } from "@/lib/subject-colors";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/icons";
import { GradeFigure } from "@/components/grades";

// Écran Notes organisé par matière : une carte par matière (sa moyenne + ses notes en étiquettes),
// qui s'ouvre sur le détail. Les couleurs viennent de lib/subject-colors.ts (data-subject).
// Pas de rouge / vert selon la note : on situe une note, on ne la juge pas.

/** Une note est « nouvelle » pendant une semaine. */
const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Note de moins d'une semaine. Composants serveur rendus à chaque requête (la page lit ?periode=,
 * derrière <Suspense>) : l'heure est celle de l'affichage, pas celle du cache des notes.
 */
export const isRecent = (iso: string) => Date.now() - Date.parse(iso) < NEW_FOR_MS;

export type SubjectGroup = {
  key: string;
  subjectId: string;
  name: string;
  average?: SubjectAverage;
  /** Du plus récent au plus ancien. */
  grades: GradeItem[];
};

/** Regroupe les notes par matière, dans l'ordre de Pronote ; les matières sans moyenne suivent. */
export function groupBySubject(subjects: SubjectAverage[], grades: GradeItem[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  const ensure = (subjectId: string, rawName: string) => {
    let g = groups.get(subjectId);
    if (!g) {
      g = { key: subjectKey(rawName), subjectId, name: rawName, grades: [] };
      groups.set(subjectId, g);
    }
    return g;
  };
  for (const s of subjects) ensure(s.subjectId, s.subject).average = s;
  for (const g of grades) ensure(g.subjectId, g.subject).grades.push(g);
  return [...groups.values()];
}

/** Équivalent sur 20 d'une note sur un autre barème ("3/5" → "12"), sinon undefined. */
export function on20(value: GradeValue, outOf: GradeValue): string | undefined {
  if (!isNumeric(value) || !isNumeric(outOf) || outOf.points <= 0 || outOf.points === 20) return undefined;
  return formatPoints({ kind: 0, points: Math.round((value.points / outOf.points) * 20 * 100) / 100 });
}

/** Nom lisible : « BUSINESS DEVELOPPEMENT » → « Business developpement » (sigles gardés). */
export const displayName = (name: string) => calmShouting(name);

/* ------------------------------------------------------------------ */
/* Bande des dernières notes                                            */
/* ------------------------------------------------------------------ */

/** Les dernières notes, en petites cartes qui défilent : « qu'est-ce qui est tombé récemment ? ». */
export function RecentGrades({ grades }: { grades: GradeItem[] }) {
  const recent = grades.slice(0, 5);
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="dernieres-notes" className="flex flex-col gap-3">
      <h2 id="dernieres-notes" className="text-headline">
        Dernières notes
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 stagger [scrollbar-width:none] sm:mx-0 sm:px-0">
        {recent.map((g) => {
          const isNew = isRecent(g.date);
          const eq = on20(g.value, g.outOf);
          return (
            <li
              key={g.id}
              data-subject={subjectKey(g.subject)}
              data-subject-name={g.subject}
              className="flex w-40 shrink-0 snap-start flex-col overflow-hidden card"
            >
              <div aria-hidden className="h-1 bg-(--subject,var(--line))" />
              <div className="flex flex-1 flex-col gap-1 px-3.5 pt-3 pb-3.5">
                <p className="flex items-center justify-between gap-2 text-caption text-ink-muted">
                  <span>{formatShortDate(g.date)}</span>
                  {isNew && <span className="font-semibold text-(--subject,var(--accent))">Nouveau</span>}
                </p>
                <p aria-label={spokenGrade(g.value, g.outOf)}>
                  <GradeFigure value={g.value} outOf={g.outOf} />
                </p>
                {eq && <p className="-mt-1 text-caption text-ink-muted tabular-nums">soit {eq}/20</p>}
                <p className="mt-auto line-clamp-2 pt-1 text-callout font-semibold">{displayName(g.subject)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes par matière                                                   */
/* ------------------------------------------------------------------ */

/** Étiquette d'une note dans la carte de sa matière : la valeur, et son équivalent sur 20 si besoin. */
function GradeChip({ g }: { g: GradeItem }) {
  const points = formatPoints(g.value);
  const max = formatPoints(g.outOf);
  const eq = on20(g.value, g.outOf);
  return (
    <li
      className="inline-flex items-baseline gap-1 rounded-full bg-(--subject-soft,var(--surface-sunken)) px-2.5 py-1 text-callout font-semibold text-(--subject,var(--ink)) tabular-nums"
      aria-label={spokenGrade(g.value, g.outOf)}
    >
      {points === undefined ? (
        <span className="text-caption">{specialLabel(g.value) ?? "—"}</span>
      ) : (
        <>
          {points}
          {max && max !== "20" && <span className="text-caption font-medium opacity-80">/{max}</span>}
          {eq && <span className="text-caption font-medium opacity-80">· {eq}/20</span>}
        </>
      )}
    </li>
  );
}

/** Une note dans le détail d'une matière : intitulé, date, coefficient, repères de la classe. */
function GradeDetail({ g }: { g: GradeItem }) {
  const cls = formatPoints(g.classAverage);
  const min = formatPoints(g.min);
  const max = formatPoints(g.max);
  const special = specialLabel(g.value);
  const context = [cls && `Classe ${cls}`, min && max && `de ${min} à ${max}`].filter(Boolean).join(" · ");
  const eq = on20(g.value, g.outOf);
  const coef = g.coefficient !== 1 ? formatPoints({ kind: 0, points: g.coefficient }) : undefined;

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium break-words">{g.comment || "Note"}</p>
          <p className="mt-0.5 text-caption text-ink-muted">{formatShortDate(g.date)}</p>
          {context && <p className="mt-0.5 text-caption text-ink-muted tabular-nums">{context}</p>}
          {(g.isBonus || g.isOptional || (special && isNumeric(g.value))) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {special && isNumeric(g.value) && <Badge tone="neutral">{special}</Badge>}
              {g.isBonus && <Badge tone="neutral">Bonus</Badge>}
              {g.isOptional && <Badge tone="neutral">Facultative</Badge>}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p aria-label={spokenGrade(g.value, g.outOf)}>
            <GradeFigure value={g.value} outOf={g.outOf} />
          </p>
          {eq && <p className="mt-0.5 text-caption text-ink-muted tabular-nums">soit {eq}/20</p>}
          {coef && <p className="mt-0.5 text-caption font-medium text-ink-muted tabular-nums">Coef. {coef}</p>}
        </div>
      </div>
      <GradeBar value={g.value} outOf={g.outOf} classAverage={g.classAverage} />
    </li>
  );
}

/**
 * Réglette d'une note, dans la couleur de la matière : remplissage = ta note, trait = moyenne de la classe.
 * Purement visuelle (aria-hidden) : les mêmes infos sont écrites au-dessus.
 */
function GradeBar({ value, outOf, classAverage }: { value: GradeValue; outOf: GradeValue; classAverage?: GradeValue }) {
  if (!isNumeric(value) || !isNumeric(outOf) || outOf.points <= 0) return null;
  const pct = (v: GradeValue) => Math.min(100, Math.max(0, (v.points / outOf.points) * 100));

  return (
    <div className="relative mt-2.5 h-3" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--subject-soft,var(--surface-sunken))" />
      <div
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-(--subject,var(--ink)) grow-x"
        style={{ width: `${pct(value)}%` }}
      />
      {isNumeric(classAverage) && (
        <div
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface"
          style={{ left: `${pct(classAverage)}%` }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Évolution des notes d'une matière                                    */
/* ------------------------------------------------------------------ */

type TrendPoint = { x: number; y: number; label: string };

/** Valeur ramenée sur 20 (pour comparer des barèmes différents sur un même axe). */
function to20(v: GradeValue | undefined, outOf: GradeValue): number | undefined {
  if (!isNumeric(v) || !isNumeric(outOf) || outOf.points <= 0) return undefined;
  return Math.min(20, Math.max(0, (v.points / outOf.points) * 20));
}

const fmt20 = (v: number) => formatPoints({ kind: 0, points: Math.round(v * 100) / 100 }) ?? "";

/**
 * Courbe des notes de la matière dans le temps, ramenées sur 20, avec la moyenne de la classe
 * à chaque devoir (pointillés). Ce sont les notes elles-mêmes, pas une moyenne recalculée.
 * - Axe unique 0–20, grille discrète ; position horizontale proportionnelle à la date.
 * - Toi = trait plein + points dans la couleur de la matière ; Classe = pointillés gris :
 *   l'identité ne repose jamais sur la couleur seule, et la légende est écrite.
 * - La liste des notes juste en dessous sert de tableau ; le graphique a un résumé pour les lecteurs d'écran.
 * Affiché à partir de deux notes chiffrées.
 */
function GradeTrend({ grades, subject }: { grades: GradeItem[]; subject: string }) {
  const chrono = grades
    .filter((g) => to20(g.value, g.outOf) !== undefined)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (chrono.length < 2) return null;

  const t0 = Date.parse(chrono[0].date);
  const span = Date.parse(chrono[chrono.length - 1].date) - t0;
  // Marge de 4 % de chaque côté pour que les points du bord ne soient pas coupés.
  const xOf = (g: GradeItem, i: number) =>
    4 + 92 * (span > 0 ? (Date.parse(g.date) - t0) / span : i / (chrono.length - 1));
  const yOf = (v: number) => 100 - (v / 20) * 100;

  const me: TrendPoint[] = chrono.map((g, i) => {
    const v = to20(g.value, g.outOf)!;
    return { x: xOf(g, i), y: yOf(v), label: `${fmt20(v)}/20 · ${formatShortDate(g.date)}${g.comment ? ` · ${g.comment}` : ""}` };
  });
  const cls: TrendPoint[] = chrono.flatMap((g, i) => {
    const v = to20(g.classAverage, g.outOf);
    return v === undefined ? [] : [{ x: xOf(g, i), y: yOf(v), label: `Classe ${fmt20(v)}/20 · ${formatShortDate(g.date)}` }];
  });
  const line = (pts: TrendPoint[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
  const last = me[me.length - 1];
  const lastValue = to20(chrono[chrono.length - 1].value, chrono[chrono.length - 1].outOf)!;

  const summary =
    `Évolution de tes notes en ${subject}, ramenées sur 20 : ` +
    chrono.map((g) => `${fmt20(to20(g.value, g.outOf)!)} le ${formatShortDate(g.date)}`).join(", ");

  return (
    <figure className="mx-4 mb-3 border-t border-line pt-3 pl-4">
      <figcaption className="mb-3 flex items-center justify-between gap-3">
        <span className="text-caption font-medium text-ink-muted">Évolution (sur 20)</span>
        <span className="flex items-center gap-3 text-caption text-ink-muted" aria-hidden>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="8" viewBox="0 0 16 8" className="overflow-visible">
              <line x1="0" y1="4" x2="16" y2="4" stroke="var(--subject, var(--ink))" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8" cy="4" r="3" fill="var(--subject, var(--ink))" />
            </svg>
            Toi
          </span>
          {cls.length > 0 && (
            <span className="flex items-center gap-1.5">
              <svg width="16" height="8" viewBox="0 0 16 8">
                <line x1="0" y1="4" x2="16" y2="4" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              Classe
            </span>
          )}
        </span>
      </figcaption>

      <div role="img" aria-label={summary} className="flex gap-2">
        {/* Graduations : 20, 10, 0 (texte en encre secondaire, jamais dans la couleur de la série). */}
        <div className="flex h-28 flex-col justify-between py-0 text-label font-medium text-ink-muted tabular-nums" aria-hidden>
          <span className="-translate-y-1/2">20</span>
          <span>10</span>
          <span className="translate-y-1/2">0</span>
        </div>

        <div className="relative h-28 flex-1 reveal-x" aria-hidden>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 50, 100].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {cls.length > 1 && (
              <polyline
                points={line(cls)}
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <polyline
              points={line(me)}
              fill="none"
              stroke="var(--subject, var(--ink))"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Points en HTML (ils restent ronds quelle que soit la largeur) ; zone de survol de 24px. */}
          {cls.map((p) => (
            <span
              key={`c${p.x}`}
              title={p.label}
              className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-muted"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}
          {me.map((p) => (
            <span
              key={`m${p.x}`}
              title={p.label}
              className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span className="size-2.5 rounded-full bg-(--subject,var(--ink)) ring-2 ring-surface" />
            </span>
          ))}
          {/* Étiquette directe sur le dernier point seulement. */}
          <span
            className="absolute text-label font-semibold text-ink tabular-nums"
            style={{ left: `${Math.min(Math.max(last.x, 8), 92)}%`, top: `${last.y}%`, transform: `translate(-50%, ${last.y < 25 ? "8px" : "calc(-100% - 8px)"})` }}
          >
            {fmt20(lastValue)}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex justify-between pl-7 text-label text-ink-muted" aria-hidden>
        <span>{formatShortDate(chrono[0].date)}</span>
        <span>{formatShortDate(chrono[chrono.length - 1].date)}</span>
      </div>
    </figure>
  );
}

/**
 * Carte d'une matière. Fermée : moyenne, moyenne de la classe et notes en étiquettes.
 * Ouverte (touche) : chaque note avec son intitulé et ses repères. <details> natif : clavier et
 * lecteurs d'écran gèrent l'ouverture sans script.
 */
function SubjectCard({ group }: { group: SubjectGroup }) {
  const { average: avg, grades } = group;
  const name = displayName(group.name);
  const cls = formatPoints(avg?.classAverage);
  const latest = grades[0];
  const isNew = latest && isRecent(latest.date);

  return (
    <li data-subject={group.key} data-subject-name={group.name} className="overflow-hidden card">
      <details className="group">
        <summary className="flex cursor-pointer list-none gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-bg active:bg-bg [&::-webkit-details-marker]:hidden">
          <div aria-hidden className="w-1 shrink-0 self-stretch rounded-full bg-(--subject,var(--line))" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-body font-semibold break-words">{name}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-muted">
                  <span>
                    {grades.length} note{grades.length > 1 ? "s" : ""}
                  </span>
                  {isNew && <span className="font-semibold text-(--subject,var(--accent))">· Nouveau</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {avg?.student ? (
                  <p aria-label={`Moyenne ${spokenGrade(avg.student, avg.outOf)}`}>
                    <GradeFigure value={avg.student} outOf={avg.outOf} />
                  </p>
                ) : (
                  <p className="text-caption text-ink-muted">Pas de moyenne</p>
                )}
                {cls && <p className="mt-0.5 text-caption text-ink-muted tabular-nums">Classe {cls}</p>}
              </div>
            </div>
            {grades.length > 0 && (
              <ul aria-label="Notes" className="mt-3 flex flex-wrap gap-1.5">
                {grades.map((g) => (
                  <GradeChip key={g.id} g={g} />
                ))}
              </ul>
            )}
          </div>
          <ChevronRightIcon
            size={16}
            aria-hidden
            className="mt-1 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-90"
          />
        </summary>
        <GradeTrend grades={grades} subject={name} />
        {grades.length > 0 && (
          <ul className="mx-4 mb-1 divide-y divide-line border-t border-line pl-4">
            {grades.map((g) => (
              <GradeDetail key={g.id} g={g} />
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}

/** Toutes les matières de la période, dans l'ordre de Pronote. */
export function SubjectCards({ groups }: { groups: SubjectGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="matieres" className="flex flex-col gap-3">
      <h2 id="matieres" className="text-headline">
        Matières
      </h2>
      <ul className="flex flex-col gap-3 stagger lg:grid lg:grid-cols-2 lg:items-start">
        {groups.map((g) => (
          <SubjectCard key={g.subjectId} group={g} />
        ))}
      </ul>
    </section>
  );
}
