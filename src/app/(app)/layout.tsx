import { Suspense } from "react";
import { Sidebar, SidebarView, TabBar, TabBarView } from "@/components/app-nav";

// Coquille des écrans connectés : barre latérale sur ordinateur, barre d'onglets en bas sur téléphone.
// Les barres lisent l'URL (onglet actif) : elles sont sous <Suspense>, avec la même barre sans onglet
// actif en attendant, pour que les routes dynamiques (/messagerie/[id]) restent prérendables.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Suspense fallback={<SidebarView pathname="" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--spacing-tabbar)+var(--spacing-tabbar-gap)*2+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <Suspense fallback={<TabBarView pathname="" />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
