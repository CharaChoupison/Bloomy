"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type SubjectPane = {
  id: string;
  /** Clé de couleur (data-subject) et nom brut (data-subject-name) de la matière. */
  subject: string;
  subjectName: string;
  /** Ligne compacte de la liste. */
  row: ReactNode;
  /** Détail affiché dans le panneau. */
  panel: ReactNode;
};

/**
 * Notes sur ordinateur : liste des matières à gauche, détail de la matière choisie à droite
 * (modèle liste-détail). Sur téléphone, ce sont les cartes dépliables qui s'affichent à la place.
 *
 * Accessibilité : c'est un jeu d'onglets vertical (flèches haut/bas, Début/Fin), la première matière
 * est choisie d'emblée pour que le panneau ne soit jamais vide. Les panneaux restent montés (masqués)
 * pour garder l'état du simulateur ; en réapparaissant, les réglettes et la courbe rejouent leur animation.
 */
export function SubjectMasterDetail({ panes, label }: { panes: SubjectPane[]; label: string }) {
  const [selected, setSelected] = useState(panes[0]?.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = panes.length - 1;
    const next =
      event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setSelected(panes[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div role="tablist" aria-orientation="vertical" aria-label={label} className="flex flex-col divide-y divide-line overflow-hidden card stagger">
        {panes.map((pane, i) => {
          const active = pane.id === selected;
          return (
            <button
              key={pane.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${i}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${i}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(pane.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              data-subject={pane.subject}
              data-subject-name={pane.subjectName}
              className={`block w-full text-left transition-colors duration-150 focus-visible:-outline-offset-2 ${
                active ? "bg-(--subject-soft,var(--accent-soft))" : "hover:bg-bg"
              }`}
            >
              {pane.row}
            </button>
          );
        })}
      </div>

      {panes.map((pane, i) => (
        <div
          key={pane.id}
          role="tabpanel"
          id={`${base}-panel-${i}`}
          aria-labelledby={`${base}-tab-${i}`}
          hidden={pane.id !== selected}
          data-subject={pane.subject}
          data-subject-name={pane.subjectName}
          // Colonne de droite, collée en haut de l'écran quand la liste est plus longue que le détail.
          className="sticky top-6 col-start-2 row-start-1 motion-safe:animate-[rise_280ms_var(--ease-spring)]"
        >
          {pane.panel}
        </div>
      ))}
    </div>
  );
}
