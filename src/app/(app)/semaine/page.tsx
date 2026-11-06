import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getWeekTimetable, mondayKey, toDateKey } from "@/lib/pronote/timetable";
import { getContentAnchors } from "@/lib/pronote/resources";
import { formatWeekRange } from "@/lib/format";
import { DayCard, DayCardSkeleton } from "@/components/day-card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Semaine · Pronoti" };

// Lit ?semaine=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function WeekPage({ searchParams }: PageProps<"/semaine">) {
  return (
    <Screen title="Semaine" wide>
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

  return (
    <>
      <WeekNav offset={offset} weekStart={weekStart} />
      {/* Téléphone : une colonne. Ordinateur : un jour par colonne. */}
      <div
        className="mx-auto flex max-w-content flex-col gap-3 lg:grid lg:max-w-none lg:items-start"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            isToday={day.date === today}
            columns
            contentAnchors={contentAnchors}
          />
        ))}
      </div>
    </>
  );
}

const href = (n: number) => (n === 0 ? "/semaine" : `/semaine?semaine=${n}`);

function WeekNav({ offset, weekStart }: { offset: number; weekStart: string }) {
  return (
    <nav className="mx-auto mb-4 flex max-w-content items-center justify-between gap-2" aria-label="Changer de semaine">
      <Link href={href(offset - 1)} className={buttonClasses("icon")} aria-label="Semaine précédente">
        <ChevronLeftIcon />
      </Link>
      <div className="text-center">
        <p className="text-body font-semibold">{formatWeekRange(weekStart)}</p>
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
