// Résolution des imports pour les tests (`npm test`, runner intégré de Node, qui exécute le
// TypeScript directement) : alias « @/ » → src/, et imports sans extension → .ts / .tsx,
// comme le fait Next. Aucune dépendance de test à installer.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base;
    if (specifier.startsWith("@/")) base = SRC + specifier.slice(2);
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      base = fileURLToPath(new URL(specifier, context.parentURL));
    }
    if (base && (!existsSync(base) || base.endsWith("/"))) {
      const found = EXTENSIONS.map((ext) => base.replace(/\/$/, "") + ext).find((p) => existsSync(p));
      if (found) return nextResolve(pathToFileURL(found).href, context);
    }
    if (base) return nextResolve(pathToFileURL(base).href, context);
    return nextResolve(specifier, context);
  },
});
