import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getLessonContents, type LessonSession } from "@/lib/pronote/resources";
import { mondayKey } from "@/lib/pronote/timetable";
import { lessonContentHref } from "@/lib/lesson-anchor";
import { formatShortDate } from "@/lib/format";
import { ChevronRightIcon, FolderOpenIcon, PaperclipIcon } from "@/components/icons";
import { SubjectToken } from "@/components/grades";
import { DashboardError, DashboardNote, DashboardSection } from "./section";

const LATEST = 4;

/** Dernières séances qui ont un contenu (cette semaine et la précédente), avec leurs fichiers. */
export async function LessonsWidget({ className }: { className?: string }) {
  await verifySession(); // signale aussi que l'heure utilisée ensuite est celle de la requête

  let sessions: LessonSession[];
  try {
    sessions = await loadLatest();
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Section className={className}>
        <DashboardError what="le contenu des cours" />
      </Section>
    );
  }

  return (
    <Section className={className}>
      {sessions.length === 0 ? (
        <DashboardNote>Aucun contenu de cours renseigné ces deux dernières semaines.</DashboardNote>
      ) : (
        <ul className="divide-y divide-line overflow-hidden card">
          {sessions.map((s) => (
            <LessonLine key={s.id} s={s} />
          ))}
        </ul>
      )}
      <Link
        href="/ressources"
        className="flex min-h-touch items-center gap-3 card px-4 py-2 transition-colors hover:bg-bg"
      >
        <FolderOpenIcon className="text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold">Ressources</span>
          <span className="block text-caption text-ink-muted">Tous les fichiers des cours et des devoirs</span>
        </span>
        <ChevronRightIcon size={16} className="text-ink-muted" />
      </Link>
    </Section>
  );
}

/** Séances déjà commencées, de la plus récente à la plus ancienne. */
async function loadLatest(): Promise<LessonSession[]> {
  const now = Date.now();
  const [current, previous] = await Promise.all([getLessonContents(mondayKey(0)), getLessonContents(mondayKey(-1))]);
  return [...current, ...previous].filter((s) => Date.parse(s.start) <= now).slice(0, LATEST);
}

function LessonLine({ s }: { s: LessonSession }) {
  const first = s.contents[0];
  const summary = [first.category, first.title].filter(Boolean).join(" · ") || first.text.split("\n")[0];
  const files = s.contents.reduce((n, c) => n + c.files.length, 0);

  return (
    <li>
      <Link href={lessonContentHref(s.dateKey, s.start)} className="flex min-h-touch items-start gap-3 px-4 py-3 hover:bg-bg">
        <SubjectToken subject={s.subject} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-body font-semibold">{s.subject}</p>
            <p className="shrink-0 text-caption text-ink-muted">{formatShortDate(s.start)}</p>
          </div>
          {summary && <p className="mt-0.5 truncate text-callout">{summary}</p>}
          {files > 0 && (
            <p className="mt-1 flex items-center gap-1 text-caption text-ink-muted">
              <PaperclipIcon size={14} />
              {files} fichier{files > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <DashboardSection
      id="accueil-cours"
      title="Derniers cours"
      more={{ href: "/cours", label: "Contenu des cours" }}
      className={className}
    >
      {children}
    </DashboardSection>
  );
}
