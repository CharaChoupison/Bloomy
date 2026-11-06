import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/preferences";

/**
 * Manifest de la PWA, servi sous /manifest.webmanifest (laissé passer par le proxy, pas de session requise).
 * Icônes : public/icons, générées par scripts/generate-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bloomy",
    short_name: "Bloomy",
    description: "Ton Pronote, en plus simple.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Écran de lancement et barre système : fond clair du design system (le manifest ne gère pas le sombre).
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Appui long sur l'icône (Android, Windows, macOS) : accès direct aux écrans les plus consultés.
    shortcuts: [
      { name: "Calendrier", short_name: "Calendrier", description: "Ton emploi du temps", url: "/semaine" },
      { name: "Devoirs", short_name: "Devoirs", description: "Ce qu'il reste à faire", url: "/devoirs" },
      { name: "Notes", short_name: "Notes", description: "Tes dernières notes et moyennes", url: "/notes" },
      { name: "Messagerie", short_name: "Messages", description: "Tes discussions avec les profs", url: "/messagerie" },
    ],
  };
}
