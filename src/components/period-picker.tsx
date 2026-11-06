import Link from "next/link";

/**
 * Choix de la période (Semestre 1, Semestre 2…) : des liens `?periode=` présentés comme un
 * contrôle segmenté, qui défile horizontalement sur téléphone. Partagé par Notes et Vie scolaire.
 */
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
    <nav aria-label="Période" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-[3px] rounded-md bg-surface-sunken p-[3px]">
        {periods.map((p) => {
          const active = p.id === currentId;
          return (
            <li key={p.id}>
              <Link
                href={`${basePath}?periode=${encodeURIComponent(p.id)}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-[9px] px-4 text-callout whitespace-nowrap transition-colors duration-200 ${
                  active ? "bg-surface font-semibold text-ink shadow-float" : "font-medium text-ink-muted hover:text-ink"
                }`}
              >
                {p.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
