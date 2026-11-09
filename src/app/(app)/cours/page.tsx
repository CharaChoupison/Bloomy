import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getLessonContents, type LessonSession } from "@/lib/pronote/resources";
import { mondayKey } from "@/lib/pronote/timetable";
import { formatDay, formatWeekRange, fromDateKey } from "@/lib/format";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { HashHighlight } from "@/components/hash-highlight";
import { LessonCard } from "@/components/lesson-card";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LessonsIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Contenu des cours · Bloomy" };

// Parcours semaine par semaine, comme la page Calendrier.
// ?semaine=-1 : décalage en semaines. ?jour=YYYY-MM-DD : ouvre la semaine de ce jour
// (lien « Contenu du cours » depuis l'emploi du temps, avec l'ancre de la séance).
export default function LessonContentsPage({ searchParams }: PageProps<"/cours">) {
  return (
    <Screen refresh title="Contenu des cours" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<LessonsSkeleton />}>
        <Lessons searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

const href = (n: number) => (n === 0 ? "/cours" : `/cours?semaine=${n}`);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Décalage (en semaines) entre la semaine courante et celle du jour donné. */
function offsetForDay(dayKey: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return undefined;
  const day = fromDateKey(dayKey);
  const current = fromDateKey(mondayKey(0));
  const monday = new Date(day.getFullYear(), day.getMonth(), day.getDate() - ((day.getDay() + 6) % 7));
  return Math.round((monday.getTime() - current.getTime()) / WEEK_MS);
}

async function Lessons({ searchParams }: Pick<PageProps<"/cours">, "searchParams">) {
  await verifySession();

  const { semaine, jour } = await searchParams;
  const fromDay = typeof jour === "string" ? offsetForDay(jour) : undefined;
  const raw = fromDay ?? (Number.parseInt(String(semaine ?? "0"), 10) || 0);
  const offset = Math.max(-52, Math.min(52, raw));
  const weekStart = mondayKey(offset);

  let sessions;
  try {
    sessions = await getLessonContents(weekStart);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <>
        <WeekNav offset={offset} weekStart={weekStart} />
        <Banner action={<Link href={href(offset)} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer le contenu des cours depuis Pronote. Réessaie dans un instant.
        </Banner>
      </>
    );
  }

  return (
    <>
      <WeekNav offset={offset} weekStart={weekStart} />
      {sessions.length === 0 ? (
        <EmptyState illustration={LessonsIllustration} title="Aucun contenu de cours">
          Tes profs n&apos;ont rien renseigné pour cette semaine.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groupByDay(sessions).map(([dateKey, items]) => (
            <section key={dateKey} aria-labelledby={`jour-${dateKey}`} className="flex flex-col gap-3">
              <h2 id={`jour-${dateKey}`} className="text-callout font-semibold">
                {formatDay(dateKey)}
              </h2>
              {items.map((s) => (
                <LessonCard key={s.id} s={s} />
              ))}
            </section>
          ))}
          <HashHighlight />
        </div>
      )}
    </>
  );
}

function groupByDay(items: LessonSession[]): [string, LessonSession[]][] {
  const map = new Map<string, LessonSession[]>();
  for (const s of items) map.set(s.dateKey, [...(map.get(s.dateKey) ?? []), s]);
  return [...map.entries()];
}

function WeekNav({ offset, weekStart }: { offset: number; weekStart: string }) {
  return (
    <nav className="mb-5 flex items-center justify-between gap-2" aria-label="Changer de semaine">
      <Link href={href(offset - 1)} className={buttonClasses("icon")} aria-label="Semaine précédente">
        <ChevronLeftIcon />
      </Link>
      <div className="text-center">
        <p className="text-body font-semibold">{formatWeekRange(weekStart)}</p>
        {offset === 0 ? (
          <p className="text-caption text-ink-muted">Cette semaine</p>
        ) : (
          <Link href="/cours" className="text-caption font-medium text-accent underline-offset-2 hover:underline">
            Revenir à cette semaine
          </Link>
        )}
      </div>
      <Link href={href(offset + 1)} className={buttonClasses("icon")} aria-label="Semaine suivante">
        <ChevronRightIcon />
      </Link>
    </nav>
  );
}

function LessonsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
      <div className="mx-auto mb-2 h-11 w-48 animate-pulse rounded-full bg-surface-sunken" />
      <div className="h-44 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
