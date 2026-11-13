// Correctifs locaux de Pawnote 1.6.2 (lancés automatiquement après `npm install`, via "postinstall").
//
// 1. Vie scolaire : plantage (« Cannot read properties of undefined (reading 'L') ») quand Pronote
//    renvoie une absence ou un retard dont le motif est « connu » mais dont la liste de motifs est vide.
//    `listeMotifs.V[0].L` → `listeMotifs.V[0]?.L` : le motif devient absent au lieu de tout faire planter.
//
// 2. Dépôt de copie : Pawnote transforme le formulaire multipart en texte (`Response.text()`) avant de
//    l'envoyer. Tout fichier binaire (PDF, image, Word…) arrive alors corrompu chez Pronote.
//    Correctif : envoyer les octets tels quels, avec l'en-tête Content-Type généré par le formulaire.
//    Au passage, la boucle « Pronote traite encore le fichier » (etat 3) est bornée à 5 essais,
//    et un fichier toujours en traitement après ces essais compte comme un échec (au lieu d'une réussite).
//
// Le script ne touche qu'à la version 1.6.2 (une autre version doit être revérifiée à la main),
// et ne fait rien si les correctifs sont déjà appliqués.
// Le code de l'app vérifie la présence du correctif 2 avant tout dépôt (src/lib/pronote/homework-upload.ts).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PATCHED_VERSION = "1.6.2";

const FIXES = [
  {
    name: "lecture de motif sécurisée",
    buggy: "e.listeMotifs.V[0].L",
    fixed: "e.listeMotifs.V[0]?.L",
  },
  {
    name: "envoi binaire du dépôt de copie",
    buggy:
      'async send(){const e=await new Response(this.form).text();this.headers["Content-Type"]=`multipart/form-data; boundary=${e.split("\\n")[0].slice(2)}`;let s=3;for(;3===s;){',
    fixed:
      'async send(){const r=new Response(this.form),e=new Uint8Array(await r.arrayBuffer());this.headers["Content-Type"]=r.headers.get("content-type");let s=3,k=0;for(;3===s&&k++<5;){',
  },
  {
    name: "dépôt encore en traitement = échec",
    buggy: "if(this.session.information.order++,0===s||2===s)throw new",
    fixed: "if(this.session.information.order++,0===s||2===s||3===s)throw new",
  },
];

// Chemin direct (pawnote n'expose pas son package.json via require.resolve).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "pawnote");
if (!existsSync(join(root, "package.json"))) {
  console.log("[patch-pawnote] pawnote non installé, rien à faire.");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (version !== PATCHED_VERSION) {
  console.warn(`[patch-pawnote] pawnote ${version} ≠ ${PATCHED_VERSION} : correctifs non appliqués, vérifie si les bugs existent encore.`);
  process.exit(0);
}

for (const file of ["dist/index.js", "dist/index.mjs"]) {
  const path = join(root, file);
  let source = readFileSync(path, "utf8");
  for (const fix of FIXES) {
    const count = source.split(fix.buggy).length - 1;
    if (count === 0) {
      const state = source.includes(fix.fixed) ? "déjà appliqué" : "code introuvable, à revérifier";
      console.log(`[patch-pawnote] ${file} : ${fix.name} — ${state}.`);
      continue;
    }
    source = source.replaceAll(fix.buggy, fix.fixed);
    console.log(`[patch-pawnote] ${file} : ${fix.name} — ${count} correction(s).`);
  }
  writeFileSync(path, source);
}
