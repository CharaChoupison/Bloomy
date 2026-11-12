import type { Metadata } from "next";
import { BellIcon, InfoIcon, PaletteIcon, SmartphoneIcon, UserIcon } from "@/components/icons";
import { LinkList } from "@/components/link-list";
import { Screen } from "@/components/screen";
import type { NavItem } from "@/lib/navigation";

export const metadata: Metadata = { title: "Réglages · Bloomy" };

// Les réglages sont rangés en dossiers : chaque écran reste court et on trouve vite
// ce qu'on cherche (divulgation progressive, plutôt qu'une longue page à faire défiler).
const APP_FOLDERS: NavItem[] = [
  { href: "/reglages/personnalisation", label: "Personnalisation", Icon: PaletteIcon, hint: "Couleur, thème, couleurs des matières" },
  { href: "/reglages/notifications", label: "Notifications", Icon: BellIcon, hint: "Nouvelles notes, devoirs et cours annulés" },
  { href: "/reglages/widget", label: "Widget iPhone", Icon: SmartphoneIcon, hint: "Ton prochain cours sur l'écran d'accueil" },
];

const ACCOUNT_FOLDERS: NavItem[] = [
  { href: "/reglages/compte", label: "Compte", Icon: UserIcon, hint: "Profil, confidentialité, déconnexion" },
  { href: "/reglages/application", label: "Application", Icon: InfoIcon, hint: "Mise à jour et version" },
];

export default function SettingsPage() {
  return (
    <Screen title="Réglages" back={{ href: "/plus", label: "Plus" }}>
      <div className="flex flex-col gap-6">
        <LinkList items={APP_FOLDERS} label="Préférences" />
        <LinkList items={ACCOUNT_FOLDERS} label="Compte et application" />
        <p className="text-center text-caption text-ink-muted tabular-nums">Bloomy v{process.env.APP_VERSION}</p>
      </div>
    </Screen>
  );
}
