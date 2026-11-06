import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getWeekTimetable, mondayKey, toDateKey, type DayTimetable } from "@/lib/pronote/timetable";
import { getContentAnchors } from "@/lib/pronote/resources";
import { formatDay } from "@/lib/format";
import { DayCard, DayCardSkeleton } from "@/components/day-card";
import { NextClass, type UpcomingClass } from "@/components/next-class";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { AssignmentsWidget } from "@/components/dashboard/assignments-widget";
import { GradesWidget } from "@/components/dashboard/grades-widget";
import { InboxWidget } from "@/components/dashboard/inbox-widget";
import { LessonsWidget } from "@/components/dashboard/lessons-widget";
import { DashboardSection, DashboardSkeleton } from "@/components/dashboard/section";
import { QuickActions } from "@/components/dashboard/quick-actions";

// Accueil en tableau de bord. Chaque bloc a son propre <Suspense> : il s'affiche dès que
// sa donnée arrive, et une erreur Pronote sur un bloc ne masque pas les autres.
//
// Ordre de lecture (téléphone) : ce qui arrive maintenant → la journée → ce qu'il faut faire
// → les nouveautés. Sur ordinateur, deux colonnes : le temps (journée, cours) à gauche,
// le travail et les infos à droite. Les colonnes sont en `display: contents` sur téléphone
// pour que `order` puisse entrelacer leurs blocs dans une seule pile.
export default function Home() {
  return (
    <Screen title="Aujourd'hui" width="wide">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <DashboardSection
            id="accueil-journee"
            title="Ta journée"
            more={{ href: "/semaine", label: "Semaine" }}
            className="order-0 lg:order-none"
          >
            <Suspense fallback={<TodaySkeleton />}>
              <Today />
            </Suspense>
          </DashboardSection>
          <Suspense fallback={<DashboardSkeleton id="accueil-cours" title="Derniers cours" height="h-48" className="order-3 lg:order-none" />}>
            <LessonsWidget className="order-3 lg:order-none" />
          </Suspense>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <Suspense fallback={<DashboardSkeleton id="accueil-devoirs" title="À faire" height="h-40" className="order-1 lg:order-none" />}>
            <AssignmentsWidget className="order-1 lg:order-none" />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton id="accueil-notes" title="Notes" className="order-2 lg:order-none" />}>
            <GradesWidget className="order-2 lg:order-none" />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton id="accueil-infos" title="Messages et actualités" className="order-4 lg:order-none" />}>
            <InboxWidget className="order-4 lg:order-none" />
          </Suspense>
        </div>
      </div>
    </Screen>
  );
}

async function Today() {
  await verifySession(); // signale aussi que l'heure utilisée ensuite est celle de la requête

  const data = await loadToday();
  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Banner action={<Link href="/" className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de joindre Pronote. Réessaie dans un instant.
        </Banner>
        <QuickActions />
      </div>
    );
  }

  const isToday = data.day?.date === data.todayKey;
  return (
    <div className="flex flex-col gap-4">
      <NextClass classes={data.upcoming} serverNow={data.now} />
      <QuickActions />
      {data.day && (
        <DayCard
          day={data.day}
          isToday={isToday}
          title={isToday ? undefined : `Prochain jour de cours · ${formatDay(data.day.date)}`}
          contentAnchors={data.contentAnchors}
        />
      )}
    </div>
  );
}

/**
 * Prochains cours non annulés et journée à afficher : aujourd'hui s'il reste un cours,
 * sinon le prochain jour de cours (demain, lundi…). `null` si Pronote ne répond pas.
 */
async function loadToday() {
  const now = Date.now();
  const todayKey = toDateKey(new Date(now));
  const anchorsPromise = getContentAnchors(mondayKey(0)); // en parallèle, non bloquant
  let days: DayTimetable[];
  try {
    days = (await getWeekTimetable(mondayKey(0))).days;
  } catch (error) {
    console.error("[pronote]", error);
    return null;
  }

  const upcomingIn = (list: DayTimetable[], weekOffset: number): UpcomingClass[] =>
    list
      .flatMap((d) => d.classes)
      .filter((c) => !c.canceled && Date.parse(c.end) > now)
      .map((c) => ({ ...c, weekOffset }));

  let upcoming = upcomingIn(days, 0);
  let contentAnchors = await anchorsPromise;

  // Plus rien cette semaine (vendredi soir, week-end) : on regarde la semaine suivante.
  if (upcoming.length === 0) {
    try {
      const nextWeek = (await getWeekTimetable(mondayKey(1))).days;
      upcoming = upcomingIn(nextWeek, 1);
      days = nextWeek;
      contentAnchors = new Set(); // pas encore de contenu pour des cours à venir
    } catch (error) {
      console.error("[pronote]", error); // non bloquant : l'encart ne s'affiche simplement pas
    }
  }

  const nextDayKey = upcoming[0] ? toDateKey(new Date(upcoming[0].start)) : todayKey;
  const day = days.find((d) => d.date === nextDayKey) ?? days.find((d) => d.date === todayKey);

  return { now, todayKey, day, upcoming: upcoming.slice(0, 12), contentAnchors };
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-[164px] animate-pulse rounded-xl bg-surface-sunken" aria-busy="true" aria-label="Chargement" />
      <QuickActions />
      <DayCardSkeleton />
    </div>
  );
}
