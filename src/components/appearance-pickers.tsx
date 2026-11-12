"use client";

import { useEffect, useRef } from "react";
import { ACCENTS, THEMES } from "@/lib/preferences";
import { setAccent, setThemePreference, useAccent, useThemePreference } from "@/lib/preferences-client";
import { CheckIcon } from "@/components/icons";
import { segmentedItem, segmentedPill, segmentedTrack } from "@/components/ui/segmented";

/**
 * Nuancier des couleurs d'accent : un vrai groupe radio (flèches du clavier),
 * chaque couleur a son nom écrit, la sélection = coche + bordure + gras.
 * Le choix s'applique tout de suite à toute l'app et il est enregistré.
 */
export function AccentPicker() {
  const current = useAccent();
  return (
    <fieldset>
      <legend className="mb-2.5 text-callout font-medium">Couleur</legend>
      <div className="grid grid-cols-3 gap-3">
        {ACCENTS.map(({ id, label }) => {
          const checked = current === id;
          return (
            <label
              key={id}
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-surface px-2 py-3 text-caption transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                checked ? "border-accent font-semibold ring-1 ring-accent" : "border-line font-medium hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="accent"
                value={id}
                checked={checked}
                onChange={() => setAccent(id)}
                className="sr-only"
              />
              {/* La pastille prend la vraie couleur de l'accent, dans le thème en cours. */}
              <span
                className="grid size-9 place-items-center rounded-full text-on-accent"
                style={{ backgroundColor: `var(--accent-${id})` }}
                aria-hidden
              >
                {checked && <CheckIcon size={18} />}
              </span>
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Contrôle segmenté Automatique / Clair / Sombre, avec la même pastille glissante que les autres
 * contrôles segmentés. Les colonnes ont la même largeur : la pastille se place en CSS, sans mesure.
 */
export function ThemePicker() {
  const current = useThemePreference();
  const index = Math.max(0, THEMES.findIndex((t) => t.id === current));
  const pillRef = useRef<HTMLSpanElement>(null);

  // La préférence n'est connue qu'au montage : on évite que la pastille glisse depuis « Automatique ».
  useEffect(() => {
    const id = requestAnimationFrame(() => pillRef.current?.setAttribute("data-ready", ""));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <fieldset>
      <legend className="mb-2.5 text-callout font-medium">Thème</legend>
      <div className={`grid grid-cols-3 ${segmentedTrack}`}>
        <span
          ref={pillRef}
          aria-hidden="true"
          className={`${segmentedPill} left-[3px]`}
          style={{
            width: `calc((100% - ${(THEMES.length + 1) * 3}px) / ${THEMES.length})`,
            translate: `calc(${index} * (100% + 3px)) 0`,
          }}
        />
        {THEMES.map(({ id, label }) => {
          const checked = current === id;
          return (
            <label
              key={id}
              className={`${segmentedItem(checked)} cursor-pointer justify-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent`}
            >
              <input
                type="radio"
                name="theme"
                value={id}
                checked={checked}
                onChange={() => setThemePreference(id)}
                className="sr-only"
              />
              {label}
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-ink-muted">Automatique suit le réglage de ton appareil.</p>
    </fieldset>
  );
}
