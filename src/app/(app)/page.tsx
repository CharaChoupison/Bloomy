import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { connection } from "next/server";
import { getWeekTimetable, mondayKey, toDateKey, type DayTimetable } from "@/lib/pronote/timetable";
import { mergeConsecutive } from "@/lib/timetable-layout";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";
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
    <Screen
      title="Aujourd'hui"
      width="wide"
      subtitle={
        <Suspense fallback={<span aria-hidden>&nbsp;</span>}>
          <TodayDate />
        </Suspense>
      }
    >
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <DashboardSection
            id="accueil-journee"
            title="Ta journée"
            more={{ href: "/semaine", label: "Calendrier" }}
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

  return (
    <div className="flex flex-col gap-4">
      <NextClass classes={data.upcoming} serverNow={data.now} hadClassesToday={data.hadClassesToday} />
      <QuickActions />
    </div>
  );
}

const todayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: SCHOOL_TIME_ZONE });

/** « Lundi 9 novembre », au-dessus du titre. Lue à la requête (pas figée au prérendu). */
async function TodayDate() {
  await connection();
  const s = todayFmt.format(new Date());
  return <>{s.charAt(0).toUpperCase() + s.slice(1)}</>;
}

/**
 * Prochains cours non annulés (aujourd'hui, puis les jours suivants), séances identiques à la suite
 * fusionnées. `null` si Pronote ne répond pas.
 */
async function loadToday() {
  const now = Date.now();
  const todayKey = toDateKey(new Date(now));
  let days: DayTimetable[];
  try {
    days = (await getWeekTimetable(mondayKey(0))).days;
  } catch (error) {
    console.error("[pronote]", error);
    return null;
  }

  const upcomingIn = (list: DayTimetable[], weekOffset: number): UpcomingClass[] =>
    mergeConsecutive(list.flatMap((d) => d.classes).filter((c) => !c.canceled))
      .filter((c) => Date.parse(c.end) > now)
      .map((c) => ({ ...c, weekOffset }));

  const hadClassesToday = days.some((d) => d.date === todayKey && d.classes.some((c) => !c.canceled));
  let upcoming = upcomingIn(days, 0);

  // Plus rien cette semaine (vendredi soir, week-end) : on regarde la semaine suivante.
  if (upcoming.length === 0) {
    try {
      const nextWeek = (await getWeekTimetable(mondayKey(1))).days;
      upcoming = upcomingIn(nextWeek, 1);
    } catch (error) {
      console.error("[pronote]", error); // non bloquant : l'encart ne s'affiche simplement pas
    }
  }

  return { now, hadClassesToday, upcoming: upcoming.slice(0, 12) };
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-[132px] animate-pulse rounded-xl bg-surface-sunken" aria-busy="true" aria-label="Chargement" />
      <div className="h-[176px] animate-pulse rounded-lg bg-surface-sunken" aria-hidden />
      <QuickActions />
    </div>
  );
}
