// Génère les icônes de la PWA (public/icons/*.png) à partir d'un papillon vectoriel.
// Usage : npm run generate-icons — à relancer seulement si le dessin ou l'accent change.
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";
import { ANTENNA, LOWER_WING, mirror, UPPER_WING, VIEW_BOX } from "../src/lib/app-logo.mjs";

/** Accent « Bleu » du design system (globals.css, --accent-bleu en clair). */
const ACCENT = "#2156d9";
/** --on-accent en clair. */
const ON_ACCENT = "#ffffff";
/** Ailes basses : ON_ACCENT à 78 % sur ACCENT, aplati en couleur opaque (rendu net quel que soit le moteur). */
const LOWER_WING_FILL = "#cedaf7";

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
