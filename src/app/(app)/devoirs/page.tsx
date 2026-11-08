import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getAssignments, type AssignmentItem } from "@/lib/pronote/assignments";
import { toDateKey } from "@/lib/pronote/timetable";
import { deadlineLabel } from "@/lib/format";
import { AssignmentRow } from "@/components/assignment-row";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Devoirs · Bloomy" };

export default function AssignmentsPage() {
  return (
    <Screen title="Devoirs">
      <Suspense fallback={<AssignmentsSkeleton />}>
        <Assignments />
      </Suspense>
    </Screen>
  );
}

async function Assignments() {
  await verifySession(); // signale aussi que la date du jour est celle de la requête

  const todayKey = toDateKey(new Date());
  let assignments;
  try {
    assignments = await getAssignments(todayKey);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href="/devoirs" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer tes devoirs depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState illustration={HomeworkIllustration} title="Aucun devoir">
        Rien à rendre dans les 4 prochaines semaines.
      </EmptyState>
    );
  }

  const left = assignments.filter((a) => !a.done).length;
  const groups = groupByDeadline(assignments);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-callout text-ink-muted" aria-live="polite">
        {left === 0 ? "Tout est fait pour les 4 prochaines semaines." : `${left} à faire sur les 4 prochaines semaines`}
      </p>
      {groups.map(([key, items]) => (
        <section key={key} aria-labelledby={`pour-${key}`} className="flex flex-col gap-2">
          <h2 id={`pour-${key}`} className="text-callout font-semibold">
            {deadlineLabel(key, todayKey)}
          </h2>
          <ul className="divide-y divide-line overflow-hidden card">
            {items.map((a) => (
              <AssignmentRow key={a.id} a={a} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupByDeadline(items: AssignmentItem[]): [string, AssignmentItem[]][] {
  const map = new Map<string, AssignmentItem[]>();
  for (const a of items) map.set(a.deadlineKey, [...(map.get(a.deadlineKey) ?? []), a]);
  return [...map.entries()];
}

function AssignmentsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-5 w-56 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-28 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
