import type { Metadata } from "next";
import { LogOutIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { LinkList } from "@/components/link-list";
import { Screen } from "@/components/screen";
import { buttonClasses } from "@/components/ui/button";
import type { NavItem } from "@/lib/navigation";
import { logout } from "../../../login/actions";

export const metadata: Metadata = { title: "Compte · Réglages · Bloomy" };

const LINKS: NavItem[] = [
  { href: "/compte", label: "Profil Pronote", Icon: UserIcon, hint: "Identité, coordonnées, INE" },
  { href: "/confidentialite", label: "Données et confidentialité", Icon: ShieldIcon, hint: "Ce que Bloomy garde, et où" },
];

export default function AccountSettingsPage() {
  return (
    <Screen title="Compte" back={{ href: "/reglages", label: "Réglages" }}>
      <div className="flex flex-col gap-8">
        <LinkList items={LINKS} />

        <section aria-labelledby="session" className="flex flex-col gap-3">
          <h2 id="session" className="text-headline">
            Session
          </h2>
          <form action={logout}>
            <button type="submit" className={buttonClasses("secondary")}>
              <LogOutIcon />
              Se déconnecter
            </button>
          </form>
          <p className="text-caption text-ink-muted">
            Supprime ta session de Bloomy sur cet appareil, ainsi que les notifications qui y sont liées.
          </p>
        </section>
      </div>
    </Screen>
  );
}
