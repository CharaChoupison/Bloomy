"use client";

import { useEffect } from "react";
import { SUBJECT_COLORS, type SubjectColor } from "@/lib/subject-colors";
import { registerSubjects, setSubjectColor, useSubjectColors } from "@/lib/subject-colors-client";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Repère les matières affichées (éléments [data-subject]) et donne une couleur à celles qui n'en ont pas.
 * Monté une fois dans la coquille de l'app : suit les changements d'écran et les contenus chargés en différé.
 */
export function SubjectColorsSync() {
  useEffect(() => {
    let frame = 0;
    const scan = () => {
      frame = 0;
      const found = new Map<string, string>();
      document.querySelectorAll<HTMLElement>("[data-subject]").forEach((el) => {
        const key = el.dataset.subject;
        if (key && !found.has(key)) found.set(key, el.dataset.subjectName ?? key);
      });
      registerSubjects([...found].map(([key, name]) => ({ key, name })));
    };
    scan();
    // Regroupe les mutations d'une même image : un seul passage par frame.
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(scan);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

const labelOf = (id: SubjectColor) => SUBJECT_COLORS.find((c) => c.id === id)?.label ?? id;

/**
 * Réglages : une ligne par matière déjà rencontrée, qui s'ouvre sur le nuancier.
 * La couleur est aussi écrite en toutes lettres (jamais la couleur seule pour l'information).
 */
export function SubjectColorsSettings() {
  const map = useSubjectColors();
  const subjects = Object.entries(map).sort(([, a], [, b]) => a.name.localeCompare(b.name, "fr"));

  if (subjects.length === 0) {
    return (
      <p className="text-caption text-ink-muted">
        Tes matières apparaîtront ici dès que tu auras ouvert ton emploi du temps ou tes devoirs.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden card">
      {subjects.map(([key, { name, color }]) => (
        <li key={key}>
          <details className="group" data-subject={key}>
            <summary className="flex min-h-touch cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-bg [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="size-6 shrink-0 rounded-full bg-(--subject)" />
              <span className="min-w-0 flex-1 truncate text-body font-medium">{name}</span>
              <span className="shrink-0 text-caption text-ink-muted">{labelOf(color)}</span>
              <ChevronRightIcon
                size={16}
                className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-90"
              />
            </summary>
            <fieldset className="px-4 pb-4">
              <legend className="sr-only">Couleur de {name}</legend>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map(({ id, label }) => {
                  const checked = id === color;
                  return (
                    <label
                      key={id}
                      title={label}
                      // La pastille montre la vraie couleur (dans le thème en cours) : on pose la matière fictive
                      // de cette couleur via les variables, sans passer par la table.
                      style={{ "--subject": `var(--subject-${id})` } as React.CSSProperties}
                      className="grid size-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                    >
                      <input
                        type="radio"
                        name={`subject-${key}`}
                        value={id}
                        checked={checked}
                        onChange={() => setSubjectColor(key, id)}
                        className="sr-only"
                        aria-label={label}
                      />
                      <span
                        aria-hidden
                        className={`grid size-8 place-items-center rounded-full bg-(--subject) text-surface transition-transform duration-150 ${
                          checked ? "ring-2 ring-(--subject) ring-offset-2 ring-offset-surface" : "hover:scale-110"
                        }`}
                      >
                        {checked && <CheckIcon size={16} strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </details>
        </li>
      ))}
    </ul>
  );
}
