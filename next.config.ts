import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import packageJson from "./package.json";

/**
 * Version affichée dans Réglages : « majeur.mineur » vient de package.json,
 * le dernier chiffre est le nombre de commits. Il augmente donc tout seul à chaque commit.
 * Sans historique Git complet (clone superficiel), on garde la version de package.json.
 */
function appVersion(): string {
  const [major = "0", minor = "0"] = packageJson.version.split(".");
  try {
    const git = (args: string) => execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (git("rev-parse --is-shallow-repository") === "true") return packageJson.version;
    return `${major}.${minor}.${git("rev-list --count HEAD")}`;
  } catch {
    return packageJson.version;
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    APP_VERSION: appVersion(),
  },
  // Pawnote (et sa crypto node-forge) est chargé tel quel par Node, sans passer par le bundler.
  serverExternalPackages: ["pawnote"],
  // Dépôt de copie (server action uploadAssignmentFile) : la limite réelle est celle de Pronote,
  // vérifiée côté client et côté serveur ; ces plafonds doivent simplement rester au-dessus.
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
