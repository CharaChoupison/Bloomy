import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Sans le correctif de scripts/patch-pawnote.mjs, Pawnote envoie la copie sous forme de texte et
// Pronote reçoit un fichier corrompu… tout en répondant que le dépôt a réussi. On vérifie donc que le
// correctif est en place avant chaque dépôt : mieux vaut refuser clairement que rendre un fichier illisible.
const FIX_MARKER = "e=new Uint8Array(await r.arrayBuffer())";
const PAWNOTE_FILES = ["dist/index.js", "dist/index.mjs"];

let patched: Promise<boolean> | undefined;

export function isUploadFixApplied(): Promise<boolean> {
  patched ??= Promise.all(
    PAWNOTE_FILES.map((file) =>
      readFile(join(process.cwd(), "node_modules", "pawnote", file), "utf8").then((source) => source.includes(FIX_MARKER)),
    ),
  )
    .then((results) => results.every(Boolean))
    .catch(() => false);
  return patched;
}

/** Nom de fichier sûr pour Pronote : sans chemin ni caractères de contrôle, longueur raisonnable. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim();
  if (cleaned.length <= 120) return cleaned || "copie";
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, 120 - ext.length) + ext;
}
