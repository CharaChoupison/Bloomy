import { verifySession } from "@/lib/auth/session";
import { getGrades, type GradesView } from "@/lib/pronote/grades";
import { formatPoints, isNumeric, spokenGrade } from "@/lib/grades-format";
import { GradeFigure, GradeRow } from "@/components/grades";
import { DashboardError, DashboardNote, DashboardSection } from "./section";

const LATEST = 3;
const OUT_OF_20 = { kind: 0, points: 20 };

/** Moyenne générale de la période en cours et dernières notes. */
export async function GradesWidget({ className }: { className?: string }) {
  await verifySession();

  let view: GradesView;
  try {
    view = await getGrades();
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Section className={className}>
        <DashboardError what="tes notes" />
      </Section>
    );
  }

  const latest = view.grades.slice(0, LATEST);
  const hasOverall = isNumeric(view.overall);
  if (latest.length === 0 && !hasOverall) {
    return (
      <Section className={className}>
        <DashboardNote>Pas encore de note pour « {view.period.name} ».</DashboardNote>
      </Section>
    );
  }

  const cls = formatPoints(view.classOverall);

  return (
    <Section className={className}>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {hasOverall && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-callout font-medium">Moyenne générale</p>
              <p className="truncate text-caption text-ink-muted">
                {view.period.name}
                {cls && ` · Classe ${cls}`}
              </p>
            </div>
            <p aria-label={spokenGrade(view.overall, OUT_OF_20)}>
              <GradeFigure value={view.overall} outOf={OUT_OF_20} />
            </p>
          </div>
        )}
        {latest.length > 0 && (
          <ul className="divide-y divide-line" aria-label="Dernières notes">
            {latest.map((g) => (
              <GradeRow key={g.id} g={g} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <DashboardSection id="accueil-notes" title="Notes" more={{ href: "/notes", label: "Notes" }} className={className}>
      {children}
    </DashboardSection>
  );
}
