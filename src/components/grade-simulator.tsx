"use client";

import { useId, useState } from "react";
import { formatPoints, GRADE_KIND } from "@/lib/grades-format";
import { parseFrenchNumber, simulate, type SimGrade } from "@/lib/grade-simulator";
import type { GradeValue } from "@/lib/pronote/grades";
import { CalculatorIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const points = (n: number): GradeValue => ({ kind: GRADE_KIND.Grade, points: n });
const fmt = (n?: number) => (n === undefined ? "—" : (formatPoints(points(n)) ?? "—"));

type Errors = Partial<Record<"value" | "outOf" | "coefficient", string>>;

/**
 * « Et si j'avais… ? » dans la carte d'une matière : on ajoute une ou plusieurs notes hypothétiques
 * et on voit la moyenne de la matière et la moyenne générale bouger. Tout reste sur l'appareil :
 * rien n'est envoyé à Pronote.
 */
export function GradeSimulator({
  subject,
  grades,
  official,
  officialOutOf,
  overall,
  subjectCount,
}: {
  subject: string;
  grades: SimGrade[];
  official?: GradeValue;
  officialOutOf?: GradeValue;
  overall?: GradeValue;
  subjectCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState<SimGrade[]>([]);
  const [value, setValue] = useState("");
  const [outOf, setOutOf] = useState("20");
  const [coefficient, setCoefficient] = useState("1");
  const [errors, setErrors] = useState<Errors>({});
  const titleId = useId();

  if (!open) {
    return (
      <div className="mx-4 mb-3 border-t border-line pt-3 pl-4">
        <Button variant="ghost" className="-ml-3" onClick={() => setOpen(true)}>
          <CalculatorIcon size={18} />
          Simuler une note
        </Button>
      </div>
    );
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const max = parseFrenchNumber(outOf);
    const v = parseFrenchNumber(value);
    const c = parseFrenchNumber(coefficient);
    const next: Errors = {};
    if (max === undefined || max <= 0 || max > 100) next.outOf = "Un barème entre 1 et 100.";
    if (v === undefined) next.value = "Indique une note, par exemple 14 ou 12,5.";
    else if (max !== undefined && v > max) next.value = `La note ne peut pas dépasser ${fmt(max)}.`;
    if (c === undefined || c <= 0 || c > 100) next.coefficient = "Un coefficient supérieur à 0.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setExtra((list) => [...list, { value: points(v!), outOf: points(max!), coefficient: c! }]);
    setValue("");
  };

  const result = simulate({ grades, extra, official, officialOutOf, overall, subjectCount });
  const scale = officialOutOf?.points && officialOutOf.points !== 20 ? ` /${fmt(officialOutOf.points)}` : " /20";

  return (
    <section aria-labelledby={titleId} className="mx-4 mb-3 flex flex-col gap-3 border-t border-line pt-3 pl-4">
      <div className="flex items-center justify-between gap-3">
        <h4 id={titleId} className="text-callout font-semibold">
          Simuler une note
        </h4>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setExtra([]);
            setErrors({});
          }}
        >
          Fermer
        </Button>
      </div>

      <form onSubmit={add} noValidate className="grid grid-cols-3 items-start gap-2">
        <TextField
          label="Note"
          inputMode="decimal"
          autoComplete="off"
          placeholder="14"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.value}
        />
        <TextField
          label="Sur"
          inputMode="decimal"
          autoComplete="off"
          value={outOf}
          onChange={(e) => setOutOf(e.target.value)}
          error={errors.outOf}
        />
        <TextField
          label="Coef."
          inputMode="decimal"
          autoComplete="off"
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
          error={errors.coefficient}
        />
        <Button type="submit" variant="secondary" className="col-span-3">
          Ajouter cette note
        </Button>
      </form>

      {extra.length > 0 && (
        <>
          <ul aria-label="Notes simulées" className="flex flex-wrap gap-1.5">
            {extra.map((g, i) => (
              <li
                key={i}
                className="inline-flex items-center rounded-full border border-dashed border-line-strong pl-3 text-callout font-semibold tabular-nums"
              >
                {fmt(g.value.points)}/{fmt(g.outOf.points)}
                {g.coefficient !== 1 && <span className="ml-1 text-caption font-medium text-ink-muted">coef. {fmt(g.coefficient)}</span>}
                <button
                  type="button"
                  onClick={() => setExtra((list) => list.filter((_, j) => j !== i))}
                  aria-label={`Retirer la note simulée ${fmt(g.value.points)} sur ${fmt(g.outOf.points)}`}
                  className="grid size-touch -my-2 place-items-center rounded-full text-ink-muted hover:text-ink"
                >
                  <XIcon size={16} />
                </button>
              </li>
            ))}
          </ul>

          <dl aria-live="polite" className="grid gap-2 rounded-md bg-surface-sunken p-3 text-callout">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Moyenne en {subject}</dt>
              <dd className="font-semibold tabular-nums">
                {fmt(result.subject.before)} → {fmt(result.subject.after)}
                <span className="text-caption font-medium text-ink-muted">{scale}</span>
              </dd>
            </div>
            {result.overall.after !== undefined && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Moyenne générale (estimation)</dt>
                <dd className="font-semibold tabular-nums">
                  {fmt(result.overall.before)} → {fmt(result.overall.after)}
                  <span className="text-caption font-medium text-ink-muted"> /20</span>
                </dd>
              </div>
            )}
          </dl>
          <p className="text-caption text-ink-muted">
            Calcul indicatif : Pronote applique aussi des coefficients par matière que Bloomy ne connaît pas.
            Rien n&apos;est envoyé à Pronote.
          </p>
        </>
      )}
    </section>
  );
}
