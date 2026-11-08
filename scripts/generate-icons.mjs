// Génère les icônes de la PWA (public/icons/*.png) à partir d'un papillon vectoriel.
// Usage : npm run generate-icons — à relancer seulement si le dessin ou l'accent change.
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

/** Accent « Bleu » du design system (globals.css, --accent-bleu en clair). */
const ACCENT = "#2156d9";
/** --on-accent en clair. */
const ON_ACCENT = "#ffffff";
/** Ailes basses : ON_ACCENT à 78 % sur ACCENT, aplati en couleur opaque (rendu net quel que soit le moteur). */
const LOWER_WING_FILL = "#cedaf7";

/*
 * Papillon (dessin original) réduit à ses ailes et antennes, décrit dans un carré 100×100.
 * Seule l'aile droite est décrite (commandes absolues M / C / Z) ; la gauche en est le miroir.
 * Sans corps, les ailes restent légèrement écartées (point le plus proche de l'axe à x = 50,6, soit 1,2
 * d'écart) et leur côté intérieur est arrondi : l'ancien bord droit, qui s'appuyait sur le corps, laissait
 * des angles vifs et un couloir de fond qui se lisait comme une barre.
 */
const UPPER_WING =
  "M50.6 48C54.6 29 72.6 19 81.6 25C88.6 30 82.6 46 69.6 50C61.6 52 55 51.3 51.4 49.6C50.9 49.3 50.6 48.7 50.6 48Z";
const LOWER_WING =
  "M52 52.9C58.6 52 70.6 55 73.6 65C75.6 73 66.6 79 58.6 75C53.6 71 51.4 62.5 50.6 55.5C50.5 54 51 53.1 52 52.9Z";
const ANTENNA = "M51.5 34C53 27 55 23 59 20";

/** Cadrage serré sur le dessin (x 12→88, y 20→79), centré à l'œil, pour qu'il occupe plus de place dans l'icône. */
const VIEW_BOX = "10 7.2 80 80";

/** Symétrique d'un chemin par rapport à l'axe vertical x = 50. */
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${100 - x} ${y}`);

/**
 * @param {number} size taille en px
 * @param {{ rounded: boolean, glyph: number }} opts
 *   rounded : coins arrondis transparents (icône « any ») ou fond plein (maskable / iOS, que le système découpe)
 *   glyph : côté du cadrage VIEW_BOX rapporté à l'icône ; à 0,7, les bouts d'ailes restent dans le cercle
 *   de sécurité des icônes maskable (rayon 40 %)
 */
function icon(size, { rounded, glyph }) {
  const glyphSize = Math.round(size * glyph);
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACCENT,
          borderRadius: rounded ? size * 0.225 : 0,
        },
      },
      h(
        "svg",
        { width: glyphSize, height: glyphSize, viewBox: VIEW_BOX },
        // Ailes basses plus claires : un peu de profondeur sans nouvelle couleur.
        ...[UPPER_WING, mirror(UPPER_WING)].map((d) => h("path", { d, fill: ON_ACCENT })),
        ...[LOWER_WING, mirror(LOWER_WING)].map((d) => h("path", { d, fill: LOWER_WING_FILL })),
        ...[ANTENNA, mirror(ANTENNA)].map((d) =>
          h("path", { d, fill: "none", stroke: ON_ACCENT, strokeWidth: 2.2, strokeLinecap: "round" }),
        ),
      ),
    ),
    { width: size, height: size },
  );
}

const ICONS = [
  { file: "icon-192.png", size: 192, rounded: true, glyph: 0.8 },
  { file: "icon-512.png", size: 512, rounded: true, glyph: 0.8 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, glyph: 0.7 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, glyph: 0.78 },
];

const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });
for (const { file, size, ...opts } of ICONS) {
  const png = Buffer.from(await icon(size, opts).arrayBuffer());
  await writeFile(new URL(file, outDir), png);
  console.log(`public/icons/${file} (${size}×${size})`);
}
