import Link from "next/link";

/**
 * Contrôle segmenté fait de liens (filtre dans l'URL) : défile horizontalement sur téléphone.
 * Utilisé pour la période (Notes, Vie scolaire) et la matière (Ressources).
 */
export function SegmentedLinks({
  label,
  items,
  currentKey,
}: {
  label: string;
  items: { key: string; label: string; href: string }[];
  currentKey: string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-[3px] rounded-md bg-surface-sunken p-[3px]">
        {items.map((item) => {
          const active = item.key === currentKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-[9px] px-4 text-callout whitespace-nowrap transition-colors duration-200 ${
                  active ? "bg-surface font-semibold text-ink shadow-float" : "font-medium text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Choix de la période (Semestre 1, Semestre 2…) via `?periode=`. Partagé par Notes et Vie scolaire. */
export function PeriodPicker({
  periods,
  currentId,
  basePath,
}: {
  periods: { id: string; name: string }[];
  currentId: string;
  basePath: string;
}) {
  if (periods.length < 2) return null;
  return (
    <SegmentedLinks
      label="Période"
      currentKey={currentId}
      items={periods.map((p) => ({ key: p.id, label: p.name, href: `${basePath}?periode=${encodeURIComponent(p.id)}` }))}
    />
  );
}
