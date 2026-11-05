// Structure de navigation (option C du Design System), partagée par la barre d'onglets,
// la barre latérale et la page Plus pour qu'elles restent cohérentes.
// Seuls les écrans qui existent sont listés (toutes les sections prévues existent désormais).
import {
  BookOpenIcon,
  CalendarIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  EllipsisIcon,
  HouseIcon,
  MailIcon,
  NewspaperIcon,
  SettingsIcon,
  SquareCheckIcon,
  UserIcon,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  Icon: (p: { size?: number; className?: string }) => React.ReactNode;
  /** Phrase d'aide affichée dans la page Plus. */
  hint?: string;
};

/** Onglets principaux (téléphone) et haut de la barre latérale (ordinateur). */
export const MAIN_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", Icon: HouseIcon },
  { href: "/semaine", label: "Semaine", Icon: CalendarIcon },
  { href: "/devoirs", label: "Devoirs", Icon: SquareCheckIcon },
  { href: "/notes", label: "Notes", Icon: ChartColumnIcon },
];

/** Rangés dans « Plus » sur téléphone ; listés directement dans la barre latérale sur ordinateur. */
export const MORE_ITEMS: NavItem[] = [
  { href: "/cours", label: "Contenu des cours", Icon: BookOpenIcon, hint: "Ce qui a été vu en classe" },
  { href: "/actualites", label: "Actualités", Icon: NewspaperIcon, hint: "Infos et sondages de l'établissement" },
  { href: "/messagerie", label: "Messagerie", Icon: MailIcon, hint: "Tes discussions avec les profs" },
  { href: "/vie-scolaire", label: "Vie scolaire", Icon: ClipboardListIcon, hint: "Absences, retards, observations" },
  { href: "/compte", label: "Compte", Icon: UserIcon, hint: "Identité, coordonnées, INE" },
  { href: "/reglages", label: "Réglages", Icon: SettingsIcon, hint: "Couleur, thème, déconnexion" },
];

export const PLUS_ITEM: NavItem = { href: "/plus", label: "Plus", Icon: EllipsisIcon };

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** L'onglet Plus est actif sur sa page et sur toutes les pages qu'il contient. */
export const isPlusActive = (pathname: string) =>
  isActive(pathname, PLUS_ITEM.href) || MORE_ITEMS.some((i) => isActive(pathname, i.href));
