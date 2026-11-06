// Prépare .env.local pour le développement : ajoute un APP_SESSION_SECRET s'il manque.
// Usage : npm run generate-secret   (puis redémarre `npm run dev`).
// Le secret existant n'est jamais remplacé : les sessions en cours restent valides.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");

let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
if (/^APP_SESSION_SECRET=.{32,}$/m.test(env)) {
  console.log("✅ APP_SESSION_SECRET est déjà défini dans .env.local, rien à changer.");
  process.exit(0);
}

const line = `APP_SESSION_SECRET=${randomBytes(32).toString("base64url")}`;
env = /^APP_SESSION_SECRET=.*$/m.test(env) ? env.replace(/^APP_SESSION_SECRET=.*$/m, line) : `${line}\n${env}`;
writeFileSync(ENV_PATH, env, { mode: 0o600 });
console.log("✅ APP_SESSION_SECRET ajouté à .env.local. Redémarre le serveur (npm run dev).");
