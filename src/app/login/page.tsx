import type { Metadata } from "next";
import { AppLogo } from "@/components/app-logo";
import { CalendarIcon, ChartColumnIcon, ClipboardListIcon } from "@/components/icons";
import { ClearOfflinePages } from "@/components/offline";
import { defaultInstanceUrl, isSingleInstance } from "@/lib/pronote/network";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion · Bloomy" };

// Ce que l'élève retrouve une fois connecté. Affiché à côté du formulaire sur grand écran seulement :
// sur téléphone, le formulaire doit tenir sans défiler, la phrase sous le titre résume déjà ces trois points.
const FEATURES = [
  { Icon: CalendarIcon, title: "Ton emploi du temps", text: "Le prochain cours, les salles et les cours annulés." },
  { Icon: ClipboardListIcon, title: "Tes devoirs", text: "Ce qu'il reste à faire, à cocher une fois terminé." },
  { Icon: ChartColumnIcon, title: "Tes notes", text: "Les dernières notes et tes moyennes par matière." },
];

// Bienvenue + connexion en un seul écran : une étape « Bienvenue » à part ne ferait
// qu'ajouter un appui sans rien apprendre à l'élève.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
      {/* Déconnexion ou session expirée : les écrans gardés hors ligne sont effacés de l'appareil. */}
      <ClearOfflinePages />
      <div className="stagger grid w-full max-w-[440px] gap-8 lg:max-w-[920px] lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16">
        <div>
          <div className="flex items-center gap-3">
            <AppLogo size={44} />
            <span className="text-title">Bloomy</span>
          </div>
          <p className="mt-8 hidden text-display lg:block">Ton Pronote, en plus simple.</p>
          <ul className="mt-8 hidden flex-col gap-5 lg:flex">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                  <Icon />
                </span>
                <div>
                  <p className="text-headline">{title}</p>
                  <p className="text-callout text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:card sm:p-8">
          <h1 className="text-display">Connexion</h1>
          <p className="mt-1 mb-8 text-body text-ink-muted">
            Retrouve tes cours, tes devoirs et tes notes avec ton compte Pronote.
          </p>
          <LoginForm askUrl={!isSingleInstance()} defaultUrl={defaultInstanceUrl()} />
        </div>
      </div>
    </main>
  );
}
