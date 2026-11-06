// Génère les icônes de la PWA (public/icons/*.png) à partir d'un papillon vectoriel.
// Usage : npm run generate-icons — à relancer seulement si le dessin ou l'accent change.
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

/** Accent « Bleu » du design system (globals.css, --accent-bleu en clair). */
const ACCENT = "#2156d9";
/** --on-accent en clair. */
const ON_ACCENT = "#ffffff";

/*
 * Papillon (clin d'œil à Pronote, dessin original) dans un carré 100×100, centré.
 * Seule l'aile droite est décrite (commandes absolues M / C / Z) ; la gauche en est le miroir.
 */
const UPPER_WING = "M53 47C57 29 75 19 84 25C91 30 85 46 72 50C64 52 57 51 53 49Z";
const LOWER_WING = "M53 53C60 52 73 55 76 65C78 73 69 79 61 75C56 71 54 63 53 56Z";
const ANTENNA = "M51.5 34C53 27 55 23 59 20";

/** Symétrique d'un chemin par rapport à l'axe vertical x = 50. */
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${100 - x} ${y}`);

/**
 * @param {number} size taille en px
 * @param {{ rounded: boolean, glyph: number }} opts
 *   rounded : coins arrondis transparents (icône « any ») ou fond plein (maskable / iOS, que le système découpe)
 *   glyph : part de l'icône occupée par le papillon (≤ 0,6 pour rester dans la zone sûre des icônes maskable)
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
        { width: glyphSize, height: glyphSize, viewBox: "0 0 100 100" },
        // Ailes basses légèrement transparentes : un peu de profondeur sans nouvelle couleur.
        ...[UPPER_WING, mirror(UPPER_WING)].map((d) => h("path", { d, fill: ON_ACCENT })),
        ...[LOWER_WING, mirror(LOWER_WING)].map((d) => h("path", { d, fill: ON_ACCENT, fillOpacity: 0.78 })),
        ...[ANTENNA, mirror(ANTENNA)].map((d) =>
          h("path", { d, fill: "none", stroke: ON_ACCENT, strokeWidth: 2.2, strokeLinecap: "round" }),
        ),
        h("rect", { x: 48.25, y: 32, width: 3.5, height: 42, rx: 1.75, fill: ON_ACCENT }),
      ),
    ),
    { width: size, height: size },
  );
}

const ICONS = [
  { file: "icon-192.png", size: 192, rounded: true, glyph: 0.8 },
  { file: "icon-512.png", size: 512, rounded: true, glyph: 0.8 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, glyph: 0.6 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, glyph: 0.7 },
];

const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });
for (const { file, size, ...opts } of ICONS) {
  const png = Buffer.from(await icon(size, opts).arrayBuffer());
  await writeFile(new URL(file, outDir), png);
  console.log(`public/icons/${file} (${size}×${size})`);
}
