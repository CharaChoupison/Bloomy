"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ChartColumnIcon, HouseIcon, SettingsIcon, SquareCheckIcon } from "@/components/icons";

// Navigation retenue (option C du Design System) : Accueil, Semaine, Devoirs, Notes, Plus.
// Seuls les écrans qui existent apparaissent : Réglages deviendra « Plus »
// (Contenu des cours, Actualités, Messagerie, Vie scolaire, Compte, Réglages).
const ITEMS = [
  { href: "/", label: "Accueil", Icon: HouseIcon },
  { href: "/semaine", label: "Semaine", Icon: CalendarIcon },
  { href: "/devoirs", label: "Devoirs", Icon: SquareCheckIcon },
  { href: "/notes", label: "Notes", Icon: ChartColumnIcon },
  { href: "/reglages", label: "Réglages", Icon: SettingsIcon },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Barre d'onglets en bas de l'écran (téléphone et tablette, < 1024px). */
export function TabBar() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-float lg:hidden"
    >
      <ul
        className="mx-auto grid h-tabbar max-w-content px-2"
        style={{ gridTemplateColumns: `repeat(${ITEMS.length}, minmax(0, 1fr))` }}
      >
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-label ${
                  active ? "text-accent" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barre latérale (ordinateur, ≥ 1024px). */
export function Sidebar() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col gap-0.5 border-r border-line bg-surface px-3 py-4 lg:flex"
    >
      <p className="px-3 pt-2 pb-4 text-title font-bold">Pronoti</p>
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch items-center gap-3 rounded-md px-3 text-body ${
                  active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink hover:bg-bg"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
