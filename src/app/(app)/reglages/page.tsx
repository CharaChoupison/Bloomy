import type { Metadata } from "next";
import { AccentPicker, ThemePicker } from "@/components/appearance-pickers";
import { LogOutIcon } from "@/components/icons";
import { ReloadAppButton } from "@/components/reload-app-button";
import { Screen } from "@/components/screen";
import { buttonClasses } from "@/components/ui/button";
import { logout } from "../../login/actions";
import packageJson from "../../../../package.json";

export const metadata: Metadata = { title: "Réglages · Pronoti" };

export default function SettingsPage() {
  return (
    <Screen title="Réglages" back={{ href: "/plus", label: "Plus" }}>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="apparence" className="flex flex-col gap-6">
          <h2 id="apparence" className="text-headline">
            Apparence
          </h2>
          <AccentPicker />
          <ThemePicker />
        </section>

        <section aria-labelledby="application" className="flex flex-col gap-3">
          <h2 id="application" className="text-headline">
            Application
          </h2>
          <ReloadAppButton />
          <p className="text-caption text-ink-muted">
            Récupère la dernière mise à jour, utile si l&apos;app est sur ton écran d&apos;accueil.
          </p>
          <p className="text-caption text-ink-muted tabular-nums">Version v{packageJson.version}</p>
        </section>

        <section aria-labelledby="compte" className="flex flex-col gap-3">
          <h2 id="compte" className="text-headline">
            Compte
          </h2>
          <form action={logout}>
            <button type="submit" className={buttonClasses("secondary")}>
              <LogOutIcon />
              Se déconnecter
            </button>
          </form>
        </section>
      </div>
    </Screen>
  );
}
