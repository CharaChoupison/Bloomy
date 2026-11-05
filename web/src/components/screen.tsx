import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

/** Gabarit d'un écran connecté : titre `t-display`, sous-titre facultatif, puis le contenu. */
export function Screen({
  title,
  subtitle,
  aside,
  back,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Action discrète à droite du titre. */
  aside?: React.ReactNode;
  /** Retour vers l'écran parent (pages rangées dans Plus) ; masqué sur ordinateur, où la barre latérale suffit. */
  back?: { href: string; label: string };
  /** Vue Semaine sur ordinateur : prend toute la largeur au lieu d'une colonne de lecture. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={`mx-auto w-full flex-1 px-4 pt-8 pb-12 sm:px-6 ${wide ? "lg:max-w-none" : "max-w-content"}`}>
      {back && (
        <Link
          href={back.href}
          className="-mt-4 mb-2 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-md pr-3 pl-1 text-body font-medium text-accent lg:hidden"
        >
          <ChevronLeftIcon />
          {back.label}
        </Link>
      )}
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          {subtitle && <p className="text-callout text-ink-muted">{subtitle}</p>}
          <h1 className="text-display">{title}</h1>
        </div>
        {aside}
      </header>
      {children}
    </main>
  );
}
