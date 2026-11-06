import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// Le token Pawnote remplace le mot de passe. Il change à CHAQUE connexion :
// on enregistre toujours le dernier reçu, sinon la connexion suivante échoue.
// Il n'est valable qu'avec le même deviceUUID, donc on les stocke ensemble.
export type SavedToken = {
  url: string;
  username: string;
  token: string;
  deviceUUID: string;
  navigatorIdentifier: string;
};

// turbopackIgnore : ce fichier est lu à l'exécution, pas au build. Sans ça, Turbopack tente de
// l'embarquer et plante en production, où .data est un lien vers /opt/pronoti/shared (hors du projet).
const TOKEN_FILE = path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "pronote-token.json");

export async function readToken(): Promise<SavedToken | null> {
  try {
    return JSON.parse(await readFile(TOKEN_FILE, "utf8")) as SavedToken;
  } catch {
    return null;
  }
}

export async function writeToken(token: SavedToken): Promise<void> {
  await mkdir(path.dirname(TOKEN_FILE), { recursive: true, mode: 0o700 });
  // Écriture atomique : fichier temporaire puis renommage, pour ne jamais laisser un token à moitié écrit.
  const tmp = `${TOKEN_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(token, null, 2), { mode: 0o600 });
  await rename(tmp, TOKEN_FILE);
}
