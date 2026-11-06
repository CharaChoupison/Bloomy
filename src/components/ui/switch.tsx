"use client";

/**
 * Interrupteur on/off (role="switch") : effet immédiat, pas de bouton « Enregistrer ».
 * Zone tactile de 44px autour d'un rail de 44×26px ; l'état se lit aussi à la position de la pastille.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nom accessible (ex. « Activer Minuit »). */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group grid size-touch shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`relative h-[26px] w-11 rounded-full transition-colors duration-200 ease-enter ${
          checked ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-surface shadow-float transition-transform duration-200 ease-enter motion-reduce:transition-none ${
            checked ? "translate-x-[18px]" : ""
          }`}
        />
      </span>
    </button>
  );
}
