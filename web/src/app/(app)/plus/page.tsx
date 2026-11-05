import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { MORE_ITEMS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Plus · Pronoti" };

// Menu « Plus » du téléphone : les sections qui n'ont pas d'onglet.
export default function MorePage() {
  return (
    <Screen title="Plus">
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {MORE_ITEMS.map(({ href, label, hint, Icon }) => (
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
    </Screen>
  );
}
