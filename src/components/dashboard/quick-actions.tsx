import Link from "next/link";
import { MORE_ITEMS, type NavItem } from "@/lib/navigation";

// Raccourcis ronds de l'Accueil (téléphone et tablette) vers les sections rangées dans « Plus » :
// sur téléphone, la barre d'onglets n'en montre que 4, ceux-ci évitent un détour par le menu.
// Sur ordinateur, la barre latérale liste déjà tout : les raccourcis seraient un doublon.
// Le libellé visible est le nom accessible (WCAG 2.5.3) : court, mais explicite.
const SHORTCUTS: { href: string; label: string }[] = [
  { href: "/messagerie", label: "Messages" },
  { href: "/cours", label: "Cours" },
  { href: "/ressources", label: "Ressources" },
  { href: "/actualites", label: "Actus" },
];

const items = SHORTCUTS.map(({ href, label }) => {
  const item = MORE_ITEMS.find((i) => i.href === href) as NavItem;
  return { ...item, short: label };
});

export function QuickActions() {
  return (
    <nav aria-label="Raccourcis" className="lg:hidden">
      <ul className="grid grid-cols-4 gap-2">
        {items.map(({ href, short, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex flex-col items-center gap-1.5 rounded-md py-1 text-caption font-medium"
            >
              <span className="grid size-14 place-items-center rounded-full bg-surface text-accent shadow-card transition-transform duration-[120ms] ease-enter group-active:scale-95 motion-reduce:transition-none">
                <Icon size={22} />
              </span>
              <span>{short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
