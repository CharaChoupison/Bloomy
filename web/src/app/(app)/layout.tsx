import { Sidebar, TabBar } from "@/components/app-nav";

// Coquille des écrans connectés : barre latérale sur ordinateur, barre d'onglets en bas sur téléphone.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <TabBar />
    </div>
  );
}
