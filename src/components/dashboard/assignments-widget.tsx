import { verifySession } from "@/lib/auth/session";
import { getAssignments, type AssignmentItem } from "@/lib/pronote/assignments";
import { toDateKey } from "@/lib/pronote/timetable";
import { addDays, deadlineLabel } from "@/lib/format";
import { AssignmentRow } from "@/components/assignment-row";
import { DashboardError, DashboardNote, DashboardSection } from "./section";

const HORIZON_DAYS = 7;
const MAX_ITEMS = 6;

/** Devoirs non faits des 7 prochains jours, cochables sur place. */
export async function AssignmentsWidget({ className }: { className?: string }) {
  await verifySession();
  const todayKey = toDateKey(new Date());
  const limitKey = addDays(todayKey, HORIZON_DAYS);

  let items: AssignmentItem[];
  try {
    items = (await getAssignments(todayKey)).filter((a) => !a.done && a.deadlineKey <= limitKey);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Section className={className}>
        <DashboardError what="tes devoirs" />
      </Section>
    );
  }

  if (items.length === 0) {
    return (
      <Section className={className}>
        <DashboardNote>Rien à rendre dans les {HORIZON_DAYS} prochains jours.</DashboardNote>
      </Section>
    );
  }

  const shown = items.slice(0, MAX_ITEMS);
  const hidden = items.length - shown.length;

  return (
    <Section className={className} count={items.length}>
      <div className="overflow-hidden card">
        {groupByDeadline(shown).map(([key, group]) => (
          <div key={key} className="border-b border-line last:border-b-0">
            <h3 className="bg-bg px-4 py-1.5 text-label text-ink-muted">{deadlineLabel(key, todayKey)}</h3>
            <ul className="divide-y divide-line border-t border-line">
              {group.map((a) => (
                <AssignmentRow key={a.id} a={a} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <p className="text-caption text-ink-muted">
          Et {hidden} autre{hidden > 1 ? "s" : ""} cette semaine, dans l&apos;onglet Devoirs.
        </p>
      )}
    </Section>
  );
}

function Section({ className, count, children }: { className?: string; count?: number; children: React.ReactNode }) {
  return (
    <DashboardSection
      id="accueil-devoirs"
      title={count ? `À faire · ${count}` : "À faire"}
      more={{ href: "/devoirs", label: "Devoirs" }}
      className={className}
    >
      {children}
    </DashboardSection>
  );
}

function groupByDeadline(items: AssignmentItem[]): [string, AssignmentItem[]][] {
  const map = new Map<string, AssignmentItem[]>();
  for (const a of items) map.set(a.deadlineKey, [...(map.get(a.deadlineKey) ?? []), a]);
  return [...map.entries()];
}
