"use client";

import { ACCENTS, THEMES } from "@/lib/preferences";
import { setAccent, setThemePreference, useAccent, useThemePreference } from "@/lib/preferences-client";
import { CheckIcon } from "@/components/icons";

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

/** Contrôle segmenté Automatique / Clair / Sombre. */
export function ThemePicker() {
  const current = useThemePreference();
  return (
    <fieldset>
      <legend className="mb-2.5 text-callout font-medium">Thème</legend>
      <div className="grid grid-cols-3 gap-[3px] rounded-md bg-surface-sunken p-[3px]">
        {THEMES.map(({ id, label }) => {
          const checked = current === id;
          return (
            <label
              key={id}
              className={`flex min-h-10 cursor-pointer items-center justify-center rounded-[9px] text-callout transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent ${
                checked ? "bg-surface font-semibold text-ink shadow-float" : "font-medium text-ink-muted hover:text-ink"
              }`}
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
