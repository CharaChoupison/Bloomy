"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAssignmentDone } from "@/app/(app)/devoirs/actions";
import type { AssignmentItem } from "@/lib/pronote/assignments";
import { AttachmentLink } from "@/components/attachment-link";
import { AlertCircleIcon, CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SubjectBar } from "@/components/grades";

const RETURN_LABELS: Record<number, string> = {
  1: "À rendre sur papier",
  2: "À déposer en ligne",
  3: "À rendre sur le kiosque",
  4: "Enregistrement audio",
};
const DIFFICULTY_LABELS: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

function formatLength(minutes: number): string {
  if (minutes < 60) return `≈ ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `≈ ${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * Un devoir : case « fait » (cochée tout de suite, enregistrée dans Pronote, annulée avec un message
 * si Pronote refuse), matière, consigne et infos utiles. Un devoir fait reste en place, grisé,
 * pour pouvoir le décocher : rien ne disparaît sous le doigt.
 */
export function AssignmentRow({
  a,
  onToggle,
  note,
}: {
  a: AssignmentItem;
  onToggle?: (id: string) => void;
  /** Précision sous la matière (ex. l'échéance d'un devoir en retard). */
  note?: string;
}) {
  const [done, setDone] = useOptimistic(a.done);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  // La coche rebondit seulement quand l'élève coche (pas pour les devoirs déjà faits à l'affichage).
  const [touched, setTouched] = useState(false);
  const inputId = `devoir-${a.id}`;

  const toggle = () => {
    const next = !done;
    setError(undefined);
    setTouched(true);
    onToggle?.(a.id);
    startTransition(async () => {
      setDone(next);
      const result = await setAssignmentDone(a.id, next);
      if (!result.ok) setError(result.error);
    });
  };

  const returnLabel = RETURN_LABELS[a.returnKind];
  const difficulty = DIFFICULTY_LABELS[a.difficulty];
  const hasMeta = returnLabel || a.hasUploadedFile || a.length || difficulty || a.attachments.length > 0;

  return (
    <li className="flex gap-3 px-4 py-3">
      {/* Case de 24px dans une cible de 44px. */}
      <label
        htmlFor={inputId}
        className="group/check -my-2.5 -ml-2.5 flex size-touch shrink-0 cursor-pointer items-center justify-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-4px] has-[:focus-visible]:outline-accent"
      >
        <input
          id={inputId}
          type="checkbox"
          checked={done}
          onChange={toggle}
          aria-busy={pending || undefined}
          aria-label={`${a.subject} : ${done ? "fait" : "à faire"}`}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="sr-only"
        />
        <span
          aria-hidden
          className={`grid size-6 place-items-center rounded-[6px] border-2 transition-[color,background-color,border-color,scale] duration-200 ease-(--ease-spring) group-active/check:scale-90 ${
            done ? "border-success bg-success-soft text-success" : "border-line-strong bg-surface"
          } ${pending ? "opacity-60" : ""}`}
        >
          {done && <CheckIcon size={16} strokeWidth={3} className={touched ? "pop" : undefined} />}
        </span>
      </label>

      <SubjectBar subject={a.subject} />

      <div className={`min-w-0 flex-1 transition-opacity duration-200 ${done ? "opacity-60" : ""}`}>
        <p className="text-body font-semibold">{a.subject}</p>
        {note && <p className="text-caption text-ink-muted">{note}</p>}
        {a.description && (
          <p className={`mt-0.5 text-callout break-words whitespace-pre-line ${done ? "line-through" : ""}`}>
            {a.description}
          </p>
        )}

        {hasMeta && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {a.hasUploadedFile ? (
              <Badge tone="success">Fichier déposé</Badge>
            ) : (
              returnLabel && <Badge tone="neutral">{returnLabel}</Badge>
            )}
            {a.length && <Badge tone="neutral">{formatLength(a.length)}</Badge>}
            {difficulty && <Badge tone="neutral">{difficulty}</Badge>}
            {a.attachments.map((f) => (
              <AttachmentLink key={f.url} file={f} />
            ))}
          </div>
        )}

        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-2 flex items-start gap-1 text-caption text-danger">
            <AlertCircleIcon size={16} className="mt-px shrink-0" />
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
