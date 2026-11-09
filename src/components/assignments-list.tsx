"use client";

import { useState } from "react";
import { organizeAssignments, type AssignmentFilter } from "@/lib/assignments-view";
import { deadlineLabel } from "@/lib/format";
import type { AssignmentItem } from "@/lib/pronote/assignments";
import { AssignmentRow } from "@/components/assignment-row";
import { AlertCircleIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkIllustration } from "@/components/illustrations";

/**
 * Liste des devoirs : en retard d'abord, puis par échéance. Le filtre vient de l'URL (`?vue=tout`),
 * mais le tri se fait ici pour garder affichés les devoirs cochés pendant la visite : en vue
 * « À faire », un devoir coché reste en place (grisé) jusqu'au prochain affichage.
 */
export function AssignmentsList({
  items,
  todayKey,
  filter,
}: {
  items: AssignmentItem[];
  todayKey: string;
  filter: AssignmentFilter;
}) {
  const [keep, setKeep] = useState<ReadonlySet<string>>(() => new Set());
  const onToggle = (id: string) => setKeep((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const { overdue, upcoming, left } = organizeAssignments(items, todayKey, filter, keep);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-callout text-ink-muted" aria-live="polite">
        {left === 0
          ? "Tout est fait pour les 4 prochaines semaines."
          : `${left} à faire${overdue.length ? `, dont ${overdue.length} en retard` : ""}`}
      </p>

      {overdue.length > 0 && (
        <section aria-labelledby="devoirs-en-retard" className="flex flex-col gap-2">
          <h2 id="devoirs-en-retard" className="flex items-center gap-1.5 text-callout font-semibold text-danger">
            <AlertCircleIcon size={16} />
            En retard
          </h2>
          <ul className="divide-y divide-line overflow-hidden card">
            {overdue.map((a) => (
              <AssignmentRow key={a.id} a={a} onToggle={onToggle} note={deadlineLabel(a.deadlineKey, todayKey)} />
            ))}
          </ul>
        </section>
      )}

      {upcoming.length === 0 && overdue.length === 0 ? (
        <EmptyState illustration={HomeworkIllustration} title="Tout est fait">
          Plus rien à rendre dans les 4 prochaines semaines.
        </EmptyState>
      ) : (
        upcoming.map(([key, group]) => (
          <section key={key} aria-labelledby={`pour-${key}`} className="flex flex-col gap-2">
            <h2 id={`pour-${key}`} className="text-callout font-semibold">
              {deadlineLabel(key, todayKey)}
            </h2>
            <ul className="divide-y divide-line overflow-hidden card">
              {group.map((a) => (
                <AssignmentRow key={a.id} a={a} onToggle={onToggle} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
