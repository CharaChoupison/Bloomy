import type { Metadata } from "next";
import { AccentPicker, ThemePicker } from "@/components/appearance-pickers";
import { CustomThemesSettings } from "@/components/custom-themes";
import { SubjectColorsSettings } from "@/components/subject-colors";
import { Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Personnalisation · Bloomy" };

export default function PersonalizationPage() {
  return (
    <Screen title="Personnalisation" back={{ href: "/reglages", label: "Réglages" }}>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="apparence" className="flex flex-col gap-6">
          <h2 id="apparence" className="text-headline">
            Apparence
          </h2>
          <AccentPicker />
          <ThemePicker />
        </section>

        <section aria-labelledby="matieres" className="flex flex-col gap-3">
          <div>
            <h2 id="matieres" className="text-headline">
              Couleurs des matières
            </h2>
            <p className="mt-1 text-caption text-ink-muted">
              Chaque matière reçoit sa couleur automatiquement. Touche-en une pour la changer.
            </p>
          </div>
          <SubjectColorsSettings />
        </section>

        <section aria-labelledby="themes-perso" className="flex flex-col gap-3">
          <h2 id="themes-perso" className="text-headline">
            Thèmes personnalisés
          </h2>
          <CustomThemesSettings />
        </section>
      </div>
    </Screen>
  );
}
