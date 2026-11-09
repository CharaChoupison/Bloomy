import { verifySession } from "@/lib/auth/session";
import { getGrades, type GradesView } from "@/lib/pronote/grades";
import { formatPoints, isNumeric, spokenGrade } from "@/lib/grades-format";
import { GradeFigure, SubjectBar } from "@/components/grades";
import { displayName, isRecent, on20 } from "@/components/grades-by-subject";
import { formatShortDate } from "@/lib/format";
import type { GradeItem } from "@/lib/pronote/grades";
import { subjectKey } from "@/lib/subject-colors";
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
      <div className="overflow-hidden card">
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
              <LatestLine key={g.id} g={g} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

/** Une dernière note, compacte : couleur et nom de la matière, date, valeur (et son équivalent sur 20). */
function LatestLine({ g }: { g: GradeItem }) {
  const eq = on20(g.value, g.outOf);
  const isNew = isRecent(g.date);
  return (
    <li data-subject={subjectKey(g.subject)} className="flex items-center gap-3 px-4 py-2.5">
      <SubjectBar subject={g.subject} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-callout font-semibold">{displayName(g.subject)}</p>
        <p className="truncate text-caption text-ink-muted">
          {isNew && <span className="font-semibold text-(--subject,var(--accent))">Nouveau · </span>}
          {formatShortDate(g.date)}
          {g.comment && ` · ${g.comment}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p aria-label={spokenGrade(g.value, g.outOf)}>
          <GradeFigure value={g.value} outOf={g.outOf} />
        </p>
        {eq && <p className="text-caption text-ink-muted tabular-nums">soit {eq}/20</p>}
      </div>
    </li>
  );
}

function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <DashboardSection id="accueil-notes" title="Notes" more={{ href: "/notes", label: "Notes" }} className={className}>
      {children}
    </DashboardSection>
  );
}
