// Définit le mot de passe d'accès à Pronoti.
// Usage : npm run hash-password   → tape ton mot de passe deux fois (rien ne s'affiche).
// Le script écrit APP_PASSWORD_HASH dans web/.env.local (et un APP_SESSION_SECRET s'il manque).
// Le mot de passe en clair n'est stocké nulle part. Redémarre `npm run dev` ensuite.
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");

function askHidden(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    let input = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", function onData(chunk) {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(input);
          return;
        } else if (ch === "\u0003") {
          stdout.write("\n");
          process.exit(1);
        } else if (ch === "\u007f" || ch === "\b") {
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      }
    });
  });
}

const password = await askHidden("Nouveau mot de passe d'accès à Pronoti (8 caractères minimum) : ");
if (password.length < 8) {
  console.error("❌ Trop court : 8 caractères minimum. Relance la commande.");
  process.exit(1);
}
const confirmation = await askHidden("Retape-le pour confirmer : ");
if (confirmation !== password) {
  console.error("❌ Les deux mots de passe ne sont pas identiques. Relance la commande.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
  scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
);
const hashLine = `APP_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;

let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
// Retire l'ancien mot de passe de test éventuel et ses commentaires.
env = env
  .split("\n")
  .filter((line) => !/^#.*(Mot de passe de TEST|À remplacer par le tien)/.test(line))
  .join("\n");
env = /^APP_PASSWORD_HASH=.*$/m.test(env)
  ? env.replace(/^APP_PASSWORD_HASH=.*$/m, hashLine)
  : `${hashLine}\n${env}`;
// La session reste valide : on ne change le secret que s'il manque.
if (!/^APP_SESSION_SECRET=.{32,}$/m.test(env)) {
  const secretLine = `APP_SESSION_SECRET=${randomBytes(32).toString("base64url")}`;
  env = /^APP_SESSION_SECRET=.*$/m.test(env)
    ? env.replace(/^APP_SESSION_SECRET=.*$/m, secretLine)
    : env.replace(hashLine, `${hashLine}\n${secretLine}`);
}
writeFileSync(ENV_PATH, env.replace(/^\n+/, ""), { mode: 0o600 });

console.log("✅ Mot de passe enregistré dans web/.env.local.");
console.log("   Redémarre le serveur (npm run dev) puis connecte-toi avec ce mot de passe.");
