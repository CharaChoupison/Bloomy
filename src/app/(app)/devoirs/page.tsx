import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getAssignments } from "@/lib/pronote/assignments";
import { toDateKey } from "@/lib/pronote/timetable";
import { addDays } from "@/lib/format";
import { OVERDUE_DAYS, parseFilter, UPCOMING_DAYS } from "@/lib/assignments-view";
import { AssignmentsList } from "@/components/assignments-list";
import { SegmentedLinks } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Devoirs · Bloomy" };

// Lit ?vue=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function AssignmentsPage({ searchParams }: PageProps<"/devoirs">) {
  return (
    <Screen refresh title="Devoirs">
      <Suspense fallback={<AssignmentsSkeleton />}>
        <Assignments searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

async function Assignments({ searchParams }: Pick<PageProps<"/devoirs">, "searchParams">) {
  await verifySession(); // signale aussi que la date du jour est celle de la requête

  const filter = parseFilter((await searchParams).vue);
  const todayKey = toDateKey(new Date());
  let assignments;
  try {
    // On remonte deux semaines en arrière pour retrouver les devoirs en retard.
    assignments = await getAssignments(addDays(todayKey, -OVERDUE_DAYS), OVERDUE_DAYS + UPCOMING_DAYS);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href="/devoirs" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer tes devoirs depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  const relevant = assignments.filter((a) => a.deadlineKey >= todayKey || !a.done);
  if (relevant.length === 0) {
    return (
      <EmptyState illustration={HomeworkIllustration} title="Aucun devoir">
        Rien à rendre dans les 4 prochaines semaines.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedLinks
        label="Afficher"
        currentKey={filter}
        items={[
          { key: "todo", label: "À faire", href: "/devoirs" },
          { key: "all", label: "Tout", href: "/devoirs?vue=tout" },
        ]}
      />
      <AssignmentsList items={relevant} todayKey={todayKey} filter={filter} />
    </div>
  );
}

function AssignmentsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-44 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-5 w-56 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-28 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
