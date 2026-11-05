"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, isPlusActive, MAIN_ITEMS, MORE_ITEMS, PLUS_ITEM, type NavItem } from "@/lib/navigation";

/** Barre d'onglets en bas de l'écran (téléphone et tablette, < 1024px) : 4 onglets + Plus. */
export function TabBar() {
  const pathname = usePathname();
  const tabs: [NavItem, boolean][] = [
    ...MAIN_ITEMS.map((item): [NavItem, boolean] => [item, isActive(pathname, item.href)]),
    [PLUS_ITEM, isPlusActive(pathname)],
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-float lg:hidden"
    >
      <ul
        className="mx-auto grid h-tabbar max-w-content px-2"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(([{ href, label, Icon }, active]) => (
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
        ))}
      </ul>
    </nav>
  );
}

/** Barre latérale (ordinateur, ≥ 1024px) : toutes les sections, sans menu Plus. */
export function Sidebar() {
  const pathname = usePathname();
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
      <p className="px-3 pt-2 pb-4 text-title font-bold">Pronoti</p>
      <ul className="flex flex-col gap-0.5">{MAIN_ITEMS.map(link)}</ul>
      <ul className="mt-4 flex flex-col gap-0.5 border-t border-line pt-4">{MORE_ITEMS.map(link)}</ul>
    </nav>
  );
}
