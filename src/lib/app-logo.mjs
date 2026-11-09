// Dessin du papillon de Bloomy, partagé entre le logo de l'interface (components/app-logo.tsx)
// et le générateur d'icônes PWA (scripts/generate-icons.mjs) : un seul endroit où le modifier.

/*
 * Papillon (dessin original) réduit à ses ailes et antennes, décrit dans un carré 100×100.
 * Seule l'aile droite est décrite (commandes absolues M / C / Z) ; la gauche en est le miroir.
 * Sans corps, les ailes restent légèrement écartées (point le plus proche de l'axe à x = 50,6, soit 1,2
 * d'écart) et leur côté intérieur est arrondi : l'ancien bord droit, qui s'appuyait sur le corps, laissait
 * des angles vifs et un couloir de fond qui se lisait comme une barre.
 */
export const UPPER_WING =
  "M50.6 48C54.6 29 72.6 19 81.6 25C88.6 30 82.6 46 69.6 50C61.6 52 55 51.3 51.4 49.6C50.9 49.3 50.6 48.7 50.6 48Z";
export const LOWER_WING =
  "M52 52.9C58.6 52 70.6 55 73.6 65C75.6 73 66.6 79 58.6 75C53.6 71 51.4 62.5 50.6 55.5C50.5 54 51 53.1 52 52.9Z";
export const ANTENNA = "M51.5 34C53 27 55 23 59 20";

/** Cadrage serré sur le dessin (x 12→88, y 20→79), centré à l'œil, pour qu'il occupe plus de place dans l'icône. */
export const VIEW_BOX = "10 7.2 80 80";

/** Symétrique d'un chemin par rapport à l'axe vertical x = 50. */
export const mirror = (/** @type {string} */ d) =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${100 - Number(x)} ${y}`);
