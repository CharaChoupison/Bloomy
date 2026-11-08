/**
 * Écran vide : un picto, un titre court, une phrase qui explique quoi attendre.
 * Centré dans l'espace restant pour qu'une page sans contenu ne ressemble pas à une page cassée.
 * Le picto est décoratif (aria-hidden) : c'est le titre qui porte l'information.
 */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Phrase d'explication (facultative), en ton neutre. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
        {icon}
      </div>
      <p className="text-headline">{title}</p>
      {children && <p className="mt-1 max-w-xs text-callout text-ink-muted">{children}</p>}
    </div>
  );
}
