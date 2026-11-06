import "server-only";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";

// Téléchargement des pièces jointes Pronote par le serveur de Bloomy.
// Pourquoi passer par le serveur : un lien direct ouvre le fichier dans un onglet (le navigateur
// ignore l'attribut `download` d'un autre domaine), et c'est la session Pronote du serveur qui a
// produit l'URL. Pour ne jamais servir de relais vers autre chose (SSRF), on n'accepte que les
// URLs « FichiersExternes » de l'instance Pronote de l'élève connecté (et la route revérifie l'IP).

const FILES_SEGMENT = "/FichiersExternes/";

/** URL du fichier si elle pointe bien vers une pièce jointe de l'instance Pronote, sinon `null`. */
export async function pronoteFileUrl(raw: string | null): Promise<URL | null> {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const viewer = await verifySession();
  const instance = new URL(await withPronote(viewer.id, async (session) => session.information.url));
  const prefix = instance.pathname.replace(/\/$/, "") + FILES_SEGMENT;
  if (url.origin !== instance.origin || !url.pathname.startsWith(prefix)) return null;
  if (url.username || url.password) return null;
  return url;
}

/** Nom du fichier tel que Pronote l'a mis dans l'URL (dernier segment). */
export function fileNameFromUrl(url: URL): string {
  const last = url.pathname.split("/").pop() ?? "";
  try {
    return decodeURIComponent(last) || "fichier";
  } catch {
    return last || "fichier";
  }
}

/** En-tête Content-Disposition qui force le téléchargement, avec un nom UTF-8 (RFC 6266 / 5987). */
export function attachmentDisposition(name: string): string {
  const clean = name.replace(/[\r\n"\\/]/g, "_").slice(0, 200);
  const ascii = clean.normalize("NFD").replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}
