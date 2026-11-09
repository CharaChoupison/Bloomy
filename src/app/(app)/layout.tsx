import { Suspense } from "react";
import { Sidebar, SidebarView, TabBar, TabBarView } from "@/components/app-nav";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { SubjectColorsSync } from "@/components/subject-colors";

// Coquille des écrans connectés : barre latérale sur ordinateur, barre d'onglets en bas sur téléphone,
// et « tirer pour actualiser » sur écran tactile.
// Les barres lisent l'URL (onglet actif) : elles sont sous <Suspense>, avec la même barre sans onglet
// actif en attendant, pour que les routes dynamiques (/messagerie/[id]) restent prérendables.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Suspense fallback={<SidebarView pathname="" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--spacing-tabbar)+var(--spacing-tabbar-offset)+var(--spacing-tabbar-gap))] lg:pb-0">
        <PullToRefresh className="flex flex-1 flex-col">{children}</PullToRefresh>
      </div>
      <Suspense fallback={<TabBarView pathname="" />}>
        <TabBar />
      </Suspense>
      <SubjectColorsSync />
    </div>
  );
}
