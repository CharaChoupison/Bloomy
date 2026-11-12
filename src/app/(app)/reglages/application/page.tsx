import type { Metadata } from "next";
import { ReloadAppButton } from "@/components/reload-app-button";
import { Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Application · Bloomy" };

export default function ApplicationSettingsPage() {
  return (
    <Screen title="Application" back={{ href: "/reglages", label: "Réglages" }}>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="mise-a-jour" className="flex flex-col gap-3">
          <h2 id="mise-a-jour" className="text-headline">
            Mise à jour
          </h2>
          <ReloadAppButton />
          <p className="text-caption text-ink-muted">
            Récupère la dernière mise à jour, utile si l&apos;app est sur ton écran d&apos;accueil.
          </p>
        </section>

        <section aria-labelledby="version" className="flex flex-col gap-1">
          <h2 id="version" className="text-headline">
            Version
          </h2>
          <p className="text-body tabular-nums">v{process.env.APP_VERSION}</p>
        </section>
      </div>
    </Screen>
  );
}
