import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getGrades, type GradesPeriod } from "@/lib/pronote/grades";
import { LatestGrades, OverallCard, SubjectAverages } from "@/components/grades";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";

export const metadata: Metadata = { title: "Notes · Pronoti" };

// Lit ?periode=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function GradesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <Screen title="Notes" wide>
      <Suspense fallback={<GradesSkeleton />}>
        <Grades searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

const href = (periodId?: string) => (periodId ? `/notes?periode=${encodeURIComponent(periodId)}` : "/notes");

async function Grades({ searchParams }: Pick<PageProps<"/notes">, "searchParams">) {
  await verifySession();
  const { periode } = await searchParams;
  const periodId = typeof periode === "string" ? periode : undefined;

  let view;
  try {
    view = await getGrades(periodId);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <div className="mx-auto max-w-content">
        <Banner action={<Link href={href(periodId)} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer tes notes depuis Pronote. Réessaie dans un instant.
        </Banner>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 lg:max-w-[1040px]">
      <PeriodPicker periods={view.periods} current={view.period} />
      {view.grades.length === 0 && view.subjects.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-callout text-ink-muted">
          Aucune note pour la période « {view.period.name} ».
        </p>
      ) : (
        <>
          <OverallCard overall={view.overall} classOverall={view.classOverall} />
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <LatestGrades grades={view.grades} />
            <SubjectAverages subjects={view.subjects} />
          </div>
        </>
      )}
    </div>
  );
}

/** Choix de la période : des liens (pas de JavaScript nécessaire), la période affichée est marquée. */
function PeriodPicker({ periods, current }: { periods: GradesPeriod[]; current: GradesPeriod }) {
  if (periods.length < 2) return null;
  return (
    <nav aria-label="Période" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-[3px] rounded-md bg-surface-sunken p-[3px]">
        {periods.map((p) => {
          const active = p.id === current.id;
          return (
            <li key={p.id}>
              <Link
                href={href(p.id)}
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

function GradesSkeleton() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-72 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-64 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
