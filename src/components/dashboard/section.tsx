import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

// Bloc du tableau de bord : un titre, un lien « Tout voir » vers l'écran complet, puis le contenu.
// Tous les blocs partagent ce gabarit pour que l'Accueil se lise comme un ensemble.

export function DashboardSection({
  id,
  title,
  more,
  className = "",
  children,
}: {
  id: string;
  title: string;
  /** Lien vers l'écran complet (le libellé dit où il mène, pas seulement « Voir plus »). */
  more?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <div className="flex min-h-touch items-center justify-between gap-3">
        <h2 id={id} className="text-headline">
          {title}
        </h2>
        {more && (
          <Link
            href={more.href}
            className="-mr-2 inline-flex min-h-touch items-center gap-0.5 rounded-md px-2 text-callout font-medium text-accent hover:bg-accent-soft"
          >
            {more.label}
            <ChevronRightIcon size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Message neutre dans une carte (bloc vide ou indisponible). */
export function DashboardNote({ children }: { children: React.ReactNode }) {
  return <p className="card px-4 py-3 text-callout text-ink-muted">{children}</p>;
}

/**
 * Bloc qui n'a pas pu être chargé : on le dit sans bloquer le reste de l'Accueil.
 * Le lien recharge la page (les autres blocs viennent du cache, c'est rapide).
 */
export function DashboardError({ what }: { what: string }) {
  return (
    <p className="card px-4 py-3 text-callout text-ink-muted">
      Impossible de récupérer {what} pour le moment.{" "}
      <Link href="/" className="font-medium text-accent underline-offset-2 hover:underline">
        Réessayer
      </Link>
    </p>
  );
}

export function DashboardSkeleton({
  id,
  title,
  height = "h-32",
  className,
}: {
  id: string;
  title: string;
  height?: string;
  className?: string;
}) {
  return (
    <DashboardSection id={id} title={title} className={className}>
      <div className={`${height} animate-pulse rounded-lg bg-surface-sunken`} aria-busy="true" aria-label="Chargement" />
    </DashboardSection>
  );
}
