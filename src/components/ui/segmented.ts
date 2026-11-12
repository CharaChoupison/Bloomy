// Styles communs des contrôles segmentés (période, matière, thème) : un rail creusé
// et une seule pastille qui glisse sous le segment actif, avec un léger rebond.
// La pastille ne s'anime qu'une fois `data-ready` posé, pour apparaître directement à sa place au chargement.

export const segmentedTrack = "relative gap-[3px] rounded-md bg-surface-sunken p-[3px]";

export const segmentedPill =
  "pointer-events-none absolute inset-y-[3px] rounded-[9px] bg-surface motion-safe:data-ready:transition-[translate,width,opacity] motion-safe:data-ready:duration-[450ms,450ms,200ms] motion-safe:data-ready:ease-(--ease-bounce)";

export const segmentedItem = (active: boolean) =>
  `relative flex min-h-10 items-center rounded-[9px] text-callout font-semibold transition-colors duration-200 ${
    active ? "text-ink" : "text-ink-muted hover:text-ink"
  }`;
