/**
 * Écran vide : une illustration au trait (voir components/illustrations.tsx), un titre court
 * et une phrase qui dit quoi attendre. Centré dans l'espace restant pour qu'une page sans contenu
 * ne ressemble pas à une page cassée. L'illustration est décorative et volontairement discrète
 * (couleur line-strong) ; le texte, lui, garde un contraste lisible : c'est lui qui informe.
 */
export function EmptyState({
  illustration: Illustration,
  title,
  children,
}: {
  illustration: React.ComponentType<{ className?: string }>;
  title: string;
  /** Phrase d'explication (facultative), en ton neutre. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <Illustration className="mb-5 size-36 text-line-strong sm:size-40" />
      <p className="text-headline">{title}</p>
      {children && <p className="mt-1 max-w-xs text-callout text-ink-muted">{children}</p>}
    </div>
  );
}
