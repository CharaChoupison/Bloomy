import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getGrades } from "@/lib/pronote/grades";
import { OverallCard } from "@/components/grades";
import { groupBySubject, RecentGrades, SubjectCards } from "@/components/grades-by-subject";
import { GradesSeenTracker } from "@/components/new-grades";
import { PeriodPicker } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { GradesIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Notes · Bloomy" };

// Lit ?periode=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function GradesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <Screen refresh title="Notes" width="wide">
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
        <EmptyState illustration={GradesIllustration} title="Aucune note">
          Pas encore de note pour la période « {view.period.name} ».
        </EmptyState>
      ) : (
        <>
          <GradesSeenTracker grades={view.grades.map(({ id, date }) => ({ id, date }))} current={periodId === undefined} markSeen />
          <OverallCard overall={view.overall} classOverall={view.classOverall} period={view.period.name} />
          <RecentGrades grades={view.grades} />
          <SubjectCards groups={groupBySubject(view.subjects, view.grades)} overall={view.overall} />
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
