"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, isPlusActive, MAIN_ITEMS, MORE_ITEMS, PLUS_ITEM, type NavItem } from "@/lib/navigation";

// Chaque barre existe en deux temps : la vue (sans hook, sert aussi de rendu d'attente)
// et la version qui lit l'URL. Avec cacheComponents, usePathname() doit être sous <Suspense>
// dès qu'une route a un segment dynamique (/messagerie/[id]) : voir app/(app)/layout.tsx.

/** Barre d'onglets en bas de l'écran (téléphone et tablette, < 1024px) : 4 onglets + Plus. */
export function TabBar() {
  return <TabBarView pathname={usePathname()} />;
}

/** Vue de la barre d'onglets ; pathname vide = aucun onglet actif (rendu d'attente). */
export function TabBarView({ pathname }: { pathname: string }) {
  const tabs: [NavItem, boolean][] = [
    ...MAIN_ITEMS.map((item): [NavItem, boolean] => [item, isActive(pathname, item.href)]),
    [PLUS_ITEM, isPlusActive(pathname)],
  ];

  return (
    // Pilule flottante en verre dépoli, détachée des bords : l'onglet actif est une pastille
    // qui épouse la forme de la barre. L'écart au bas suit la zone sûre (barre d'accueil iOS).
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-[max(var(--spacing-tabbar-gap),env(safe-area-inset-bottom))] z-10 mx-auto w-[min(460px,calc(100%-32px))] animate-[tabbar-in_360ms_var(--ease-spring)_180ms_backwards] rounded-full border border-line/80 bg-surface/85 p-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul
        className="grid min-h-[calc(var(--spacing-tabbar)-14px)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(([{ href, label, Icon }, active]) => (
          <li key={href} className="flex">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-label transition-[color,background-color,transform] duration-200 ease-(--ease-spring) motion-safe:active:scale-[0.92] ${
                active ? "bg-accent-soft text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon />
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barre latérale (ordinateur, ≥ 1024px) : toutes les sections, sans menu Plus. */
export function Sidebar() {
  return <SidebarView pathname={usePathname()} />;
}

/** Vue de la barre latérale ; pathname vide = aucune section active (rendu d'attente). */
export function SidebarView({ pathname }: { pathname: string }) {
  const link = ({ href, label, Icon }: NavItem) => {
    const active = isActive(pathname, href);
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
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col gap-0.5 border-r border-line bg-surface px-3 py-4 lg:flex"
    >
      <p className="px-3 pt-2 pb-4 text-title font-bold">Bloomy</p>
      <ul className="flex flex-col gap-0.5">{MAIN_ITEMS.map(link)}</ul>
      <ul className="mt-4 flex flex-col gap-0.5 border-t border-line pt-4">{MORE_ITEMS.map(link)}</ul>
    </nav>
  );
}
