import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import type { NavItem } from "@/lib/navigation";

/**
 * Liste de liens groupés dans une carte (page Plus, dossiers des Réglages) :
 * icône, intitulé, phrase d'aide facultative et chevron, comme une liste de réglages iOS.
 */
export function LinkList({ items, label }: { items: NavItem[]; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-line overflow-hidden card">
      {items.map(({ href, label, hint, Icon }) => (
        <li key={href}>
          <Link href={href} className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-bg">
            <Icon className="text-ink-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">{label}</span>
              {hint && <span className="block text-caption text-ink-muted">{hint}</span>}
            </span>
            <ChevronRightIcon size={16} className="text-ink-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
