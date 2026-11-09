import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getWeekTimetable, mondayKey, toDateKey, type DayTimetable } from "@/lib/pronote/timetable";
import { getContentAnchors } from "@/lib/pronote/resources";
import { DayCard, DayCardSkeleton, FreeDaysCard } from "@/components/day-card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { buttonClasses } from "@/components/ui/button";
import { WeekPicker } from "@/components/week-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Calendrier · Bloomy" };

// Lit ?semaine=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function WeekPage({ searchParams }: PageProps<"/semaine">) {
  return (
    <Screen refresh title="Calendrier" width="full">
      <Suspense fallback={<WeekSkeleton />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

async function Week({ searchParams }: Pick<PageProps<"/semaine">, "searchParams">) {
  await verifySession();

  const { semaine } = await searchParams;
  const offset = Math.max(-52, Math.min(52, Number.parseInt(String(semaine ?? "0"), 10) || 0));
  const weekStart = mondayKey(offset);
  const today = offset === 0 ? toDateKey(new Date()) : null;

  let week;
  // Contenus de cours chargés en parallèle (non bloquant) pour les liens « Contenu du cours ».
  const anchorsPromise = getContentAnchors(weekStart);
  try {
    week = await getWeekTimetable(weekStart);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <>
        <WeekNav offset={offset} weekStart={weekStart} />
        <Banner action={<Link href={href(offset)} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer l&apos;emploi du temps depuis Pronote. Réessaie dans un instant.
        </Banner>
      </>
    );
  }

  // Samedi et dimanche ne s'affichent que s'il y a cours.
  const days = week.days.filter((d, i) => i < 5 || d.classes.length > 0);
  const contentAnchors = await anchorsPromise;
  const groups = groupFreeDays(days);

  return (
    <>
      <WeekNav offset={offset} weekStart={weekStart} />
      {groups.every((g) => g.type === "free") ? (
        <EmptyState illustration={CalendarIllustration} title="Aucun cours cette semaine">
          Vacances ou semaine libre : rien n&apos;est prévu à l&apos;emploi du temps.
        </EmptyState>
      ) : (
        /* Téléphone : une colonne. Ordinateur : un jour par colonne, les jours libres
           consécutifs regroupés dans une colonne étroite pour laisser la place aux autres. */
        <div
          className="mx-auto flex max-w-content flex-col gap-3 lg:grid lg:max-w-none lg:items-start"
          style={{
            gridTemplateColumns: groups.map((g) => (g.type === "free" ? "8.5rem" : "minmax(0, 1fr)")).join(" "),
          }}
        >
          {groups.map((g) =>
            g.type === "free" ? (
              <FreeDaysCard key={g.days[0].date} days={g.days} today={today} />
            ) : (
              <DayCard
                key={g.day.date}
                day={g.day}
                isToday={g.day.date === today}
                columns
                contentAnchors={contentAnchors}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

type DayGroup = { type: "day"; day: DayTimetable } | { type: "free"; days: DayTimetable[] };

/** Regroupe les jours consécutifs sans cours. */
function groupFreeDays(days: readonly DayTimetable[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const day of days) {
    const last = groups.at(-1);
    if (day.classes.length > 0) groups.push({ type: "day", day });
    else if (last?.type === "free") last.days.push(day);
    else groups.push({ type: "free", days: [day] });
  }
  return groups;
}

const href = (n: number) => (n === 0 ? "/semaine" : `/semaine?semaine=${n}`);

function WeekNav({ offset, weekStart }: { offset: number; weekStart: string }) {
  return (
    <nav className="mx-auto mb-4 flex max-w-content items-center justify-between gap-2" aria-label="Changer de semaine">
      <Link href={href(offset - 1)} className={buttonClasses("icon")} aria-label="Semaine précédente">
        <ChevronLeftIcon />
      </Link>
      <div className="flex flex-col items-center">
        <WeekPicker weekStart={weekStart} offset={offset} hrefFor="/semaine" />
        {offset === 0 ? (
          <p className="text-caption text-ink-muted">Cette semaine</p>
        ) : (
          <Link href="/semaine" className="text-caption font-medium text-accent underline-offset-2 hover:underline">
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

function WeekSkeleton() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-3" aria-busy="true" aria-label="Chargement">
      <div className="mx-auto mb-1 h-11 w-48 animate-pulse rounded-full bg-surface-sunken" />
      {Array.from({ length: 3 }, (_, i) => (
        <DayCardSkeleton key={i} />
      ))}
    </div>
  );
}
