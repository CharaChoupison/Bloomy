import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getGrades } from "@/lib/pronote/grades";
import { LatestGrades, OverallCard, SubjectAverages } from "@/components/grades";
import { PeriodPicker } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";

export const metadata: Metadata = { title: "Notes · Pronoti" };

// Lit ?periode=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function GradesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <Screen title="Notes" width="wide">
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
      <div>
        <Banner action={<Link href={href(periodId)} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer tes notes depuis Pronote. Réessaie dans un instant.
        </Banner>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PeriodPicker periods={view.periods} currentId={view.period.id} basePath="/notes" />
      {view.grades.length === 0 && view.subjects.length === 0 ? (
        <p className="card px-4 py-3 text-callout text-ink-muted">
          Aucune note pour la période « {view.period.name} ».
        </p>
      ) : (
        <>
          <OverallCard overall={view.overall} classOverall={view.classOverall} period={view.period.name} />
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <LatestGrades grades={view.grades} />
            <SubjectAverages subjects={view.subjects} />
          </div>
        </>
      )}
    </div>
  );
}

function GradesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-72 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-64 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
