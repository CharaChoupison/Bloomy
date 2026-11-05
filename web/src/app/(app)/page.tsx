import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getWeekTimetable, mondayKey, toDateKey } from "@/lib/pronote/timetable";
import { getContentAnchors } from "@/lib/pronote/resources";
import { DayCard, DayCardSkeleton } from "@/components/day-card";
import { NextClass, type UpcomingClass } from "@/components/next-class";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";

// Accueil : ce qui arrive maintenant (prochain cours), puis la journée.
// La partie qui dépend de la requête (session, heure) est rendue derrière <Suspense>.
export default function Home() {
  return (
    <Screen title="Aujourd'hui">
      <Suspense fallback={<TodaySkeleton />}>
        <Today />
      </Suspense>
    </Screen>
  );
}

async function Today() {
  await verifySession(); // signale aussi que l'heure utilisée ensuite est celle de la requête

  const data = await loadToday();
  if (!data) {
    return (
      <Banner action={<Link href="/" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de joindre Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <NextClass classes={data.upcoming} serverNow={data.now} />
      {data.today && <DayCard day={data.today} isToday contentAnchors={data.contentAnchors} />}
    </div>
  );
}

/** La journée en cours et les prochains cours non annulés. `null` si Pronote ne répond pas. */
async function loadToday() {
  const now = Date.now();
  const anchorsPromise = getContentAnchors(mondayKey(0)); // en parallèle, non bloquant
  let week;
  try {
    week = await getWeekTimetable(mondayKey(0));
  } catch (error) {
    console.error("[pronote]", error);
    return null;
  }

  const today = week.days.find((d) => d.date === toDateKey(new Date(now)));
  let upcoming: UpcomingClass[] = week.days
    .flatMap((d) => d.classes)
    .filter((c) => !c.canceled && Date.parse(c.end) > now)
    .map((c) => ({ ...c, weekOffset: 0 }));

  // Plus rien cette semaine (vendredi soir, week-end) : on regarde la semaine suivante.
  if (upcoming.length === 0) {
    try {
      const nextWeek = await getWeekTimetable(mondayKey(1));
      upcoming = nextWeek.days
        .flatMap((d) => d.classes)
        .filter((c) => !c.canceled)
        .map((c) => ({ ...c, weekOffset: 1 }));
    } catch (error) {
      console.error("[pronote]", error); // non bloquant : l'encart ne s'affiche simplement pas
    }
  }

  return { now, today, upcoming: upcoming.slice(0, 12), contentAnchors: await anchorsPromise };
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
      <div className="h-[72px] animate-pulse rounded-lg bg-surface-sunken" />
      <DayCardSkeleton />
    </div>
  );
}
