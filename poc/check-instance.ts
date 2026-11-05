// Étape 1a : vérifier que le serveur Pronote répond, SANS se connecter.
// On interroge juste la page publique d'infos de l'instance (nom, version, types de comptes, CAS éventuel).
import { instance } from "pawnote";

const url = process.env.PRONOTE_URL ?? "http://nice.ilec.fr/mobile.eleve.html";

try {
  const info = await instance(url);
  console.log("✅ Serveur joignable :", url);
  console.log("   Établissement :", info.name);
  console.log("   Version Pronote :", info.version.join("."));
  console.log("   Espaces :", info.accounts.map((a) => `${a.name} (${a.path})`).join(", "));
  console.log(
    "   Connexion :",
    info.casURL ? `via ENT/CAS (${info.casURL}) ⚠️ identifiant/mot de passe direct peut ne pas marcher` : "directe (pas d'ENT/CAS) 👍",
  );
} catch (error) {
  console.error("❌ Impossible de joindre le serveur :", error);
  process.exitCode = 1;
}
