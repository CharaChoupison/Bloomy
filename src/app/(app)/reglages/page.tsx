import type { Metadata } from "next";
import Link from "next/link";
import { AccentPicker, ThemePicker } from "@/components/appearance-pickers";
import { CustomThemesSettings } from "@/components/custom-themes";
import { ChevronRightIcon, LogOutIcon, SmartphoneIcon } from "@/components/icons";
import { ReloadAppButton } from "@/components/reload-app-button";
import { Screen } from "@/components/screen";
import { buttonClasses } from "@/components/ui/button";
import { logout } from "../../login/actions";

export const metadata: Metadata = { title: "Réglages · Bloomy" };

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

        <section aria-labelledby="themes-perso" className="flex flex-col gap-3">
          <h2 id="themes-perso" className="text-headline">
            Thèmes personnalisés
          </h2>
          <CustomThemesSettings />
        </section>

        <section aria-labelledby="application" className="flex flex-col gap-3">
          <h2 id="application" className="text-headline">
            Application
          </h2>
          <Link href="/reglages/widget" className="flex min-h-touch items-center gap-3 card px-4 py-3 hover:bg-bg">
            <SmartphoneIcon className="text-ink-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Widget iPhone</span>
              <span className="block text-caption text-ink-muted">Ton prochain cours et tes devoirs sur l&apos;écran d&apos;accueil</span>
            </span>
            <ChevronRightIcon size={16} className="text-ink-muted" />
          </Link>
          <ReloadAppButton />
          <p className="text-caption text-ink-muted">
            Récupère la dernière mise à jour, utile si l&apos;app est sur ton écran d&apos;accueil.
          </p>
          <p className="text-caption text-ink-muted tabular-nums">Version v{process.env.APP_VERSION}</p>
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
          <p className="text-caption text-ink-muted">
            Supprime ta session de Bloomy sur cet appareil.{" "}
            <Link
              href="/confidentialite"
              className="rounded-sm font-medium text-accent underline underline-offset-2"
            >
              Données et confidentialité
            </Link>
          </p>
        </section>
      </div>
    </Screen>
  );
}
