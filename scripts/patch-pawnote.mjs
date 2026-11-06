// Correctif local de Pawnote 1.6.2 (lancé automatiquement après `npm install`, via "postinstall").
//
// Bug : la vie scolaire plante (« Cannot read properties of undefined (reading 'L') ») quand Pronote
// renvoie une absence ou un retard dont le motif est « connu » mais dont la liste de motifs est vide.
// Pawnote lit alors `listeMotifs.V[0].L` sans vérifier que la liste contient un élément.
// Correctif : `listeMotifs.V[0]?.L` → le motif devient simplement absent au lieu de tout faire planter.
//
// Le script ne touche qu'à la version 1.6.2 (une autre version doit être revérifiée à la main),
// et ne fait rien si le correctif est déjà appliqué.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PATCHED_VERSION = "1.6.2";
const BUGGY = "e.listeMotifs.V[0].L";
const FIXED = "e.listeMotifs.V[0]?.L";

// Chemin direct (pawnote n'expose pas son package.json via require.resolve).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "pawnote");
if (!existsSync(join(root, "package.json"))) {
  console.log("[patch-pawnote] pawnote non installé, rien à faire.");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (version !== PATCHED_VERSION) {
  console.warn(`[patch-pawnote] pawnote ${version} ≠ ${PATCHED_VERSION} : correctif non appliqué, vérifie si le bug existe encore.`);
  process.exit(0);
}

for (const file of ["dist/index.js", "dist/index.mjs"]) {
  const path = join(root, file);
  const source = readFileSync(path, "utf8");
  const count = source.split(BUGGY).length - 1;
  if (count === 0) {
    console.log(`[patch-pawnote] ${file} : déjà corrigé.`);
    continue;
  }
  writeFileSync(path, source.replaceAll(BUGGY, FIXED));
  console.log(`[patch-pawnote] ${file} : ${count} lecture(s) de motif sécurisée(s).`);
}
