import "server-only";
import { createCipheriv, createHash } from "node:crypto";
import { resourcesFromIntervals, type Resource, type SessionHandle } from "pawnote";
import type { PlainAttachment } from "./attachments";

// « Autres documents » : fichiers que les profs déposent dans les ressources pédagogiques d'une
// matière sans les rattacher à une séance (Cahier de textes › Contenu et ressources, colonne de droite).
// Pronote les renvoie dans la même réponse que le contenu des cours (`ListeRessourcesPedagogiques`),
// mais Pawnote 1.6.2 ne lit que `ListeCahierDeTextes`. On garde donc la réponse brute de cette requête
// pour en extraire ces documents, sans requête supplémentaire.

export type SubjectDocument = {
  id: string;
  subject: string;
  /** Date de dépôt (ISO). */
  date: string;
  file: PlainAttachment;
};

type RawRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is RawRecord => typeof v === "object" && v !== null && !Array.isArray(v);
/** Valeur d'un champ Pronote `{ _T, V }`. */
const valueOf = (v: unknown): unknown => (isRecord(v) && "V" in v ? v.V : undefined);
const listOf = (v: unknown): unknown[] => {
  const inner = valueOf(v);
  return Array.isArray(inner) ? inner : [];
};

/**
 * Comme `resourcesFromIntervals`, en récupérant aussi les « autres documents » de la même réponse.
 * La file d'attente de la session est enveloppée le temps de l'appel pour lire la réponse décodée ;
 * si Pawnote change sa structure interne, on retombe simplement sur « aucun document ».
 */
export async function resourcesWithDocuments(
  session: SessionHandle,
  from: Date,
  to: Date,
): Promise<{ resources: Resource[]; documents: SubjectDocument[] }> {
  let raw: unknown;
  const queue = {
    push: async <T,>(job: () => Promise<T>) => {
      const response = await session.queue.push(job);
      raw = response;
      return response;
    },
  } as unknown as SessionHandle["queue"];
  // Même objet `information` (clés AES, numéro d'ordre) : seule la file change.
  const resources = await resourcesFromIntervals({ ...session, queue }, from, to);

  // Fichiers déjà joints au contenu d'une séance : ils apparaissent aussi dans la liste brute.
  const attached = new Set(resources.flatMap((r) => r.contents.flatMap((c) => c.files.map((f) => f.id))));

  try {
    return { resources, documents: parseDocuments(session, raw).filter((d) => !attached.has(d.id)) };
  } catch (error) {
    console.error("[pronote] autres documents", error);
    return { resources, documents: [] };
  }
}

function parseDocuments(session: SessionHandle, response: unknown): SubjectDocument[] {
  const body = isRecord(response) && isRecord(response.data) ? response.data : undefined;
  const data = body && Object.values(body).find((v) => isRecord(v) && "ListeRessourcesPedagogiques" in v);
  if (!isRecord(data)) return [];

  const container = valueOf(data.ListeRessourcesPedagogiques);
  if (!isRecord(container)) return [];

  const subjects = new Map<string, string>();
  for (const m of listOf(container.listeMatieres)) {
    if (isRecord(m) && typeof m.N === "string" && typeof m.L === "string") subjects.set(m.N, m.L);
  }

  return listOf(container.listeRessources).flatMap((item): SubjectDocument[] => {
    if (!isRecord(item)) return [];
    const resource = valueOf(item.ressource);
    const subject = valueOf(item.matiere);
    const date = parsePronoteDate(valueOf(item.date));
    if (!isRecord(resource) || typeof resource.N !== "string" || !date) return [];

    const name = typeof resource.L === "string" && resource.L.trim() ? resource.L.trim() : "Document";
    const link = typeof resource.url === "string" ? resource.url : undefined;
    const url = link ?? fileUrl(session, resource.N, name);
    if (!/^https?:\/\//i.test(url)) return [];

    const subjectId = isRecord(subject) && typeof subject.N === "string" ? subject.N : "";
    return [
      {
        id: resource.N,
        subject: subjects.get(subjectId) ?? (isRecord(subject) && typeof subject.L === "string" ? subject.L : "Autre"),
        date: date.toISOString(),
        file: { name, url, isLink: Boolean(link) },
      },
    ];
  });
}

/** "12/11/2026" ou "19/11/2026 13:20:00" → Date locale. */
function parsePronoteDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!m) return undefined;
  const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

/**
 * URL « FichiersExternes » d'un fichier, construite exactement comme Pawnote le fait pour les pièces
 * jointes : `{ N, Actif: true }` chiffré en AES-CBC avec les clés de la session (MD5 de la clé et de l'IV).
 */
function fileUrl(session: SessionHandle, id: string, name: string): string {
  const { aesKey, aesIV, url, id: sessionId } = session.information;
  const md5 = (s: string) => createHash("md5").update(Buffer.from(s, "binary")).digest();
  const cipher = createCipheriv("aes-128-cbc", md5(aesKey), aesIV ? md5(aesIV) : Buffer.alloc(16));
  const token = Buffer.concat([cipher.update(JSON.stringify({ N: id, Actif: true }), "utf8"), cipher.final()]).toString("hex");
  return `${url}/FichiersExternes/${token}/${encodeURIComponent(name)}?Session=${sessionId}`;
}
