import "server-only";
import { cacheLife } from "next/cache";
import { news } from "pawnote";
import { withPronote } from "./client";
import { plainAttachments, type PlainAttachment } from "./attachments";
import { htmlToText } from "@/lib/html-to-text";

export type NewsEntry = {
  id: string;
  kind: "information" | "survey";
  title: string;
  category: string;
  author: string;
  date: string; // ISO (début de publication)
  /** Texte brut (le HTML de Pronote est converti côté serveur). */
  text: string;
  attachments: PlainAttachment[];
  /** Information qui demande un accusé de réception non encore donné. */
  needsAcknowledgement: boolean;
  /** Sondage : intitulés des questions, et s'il reste des réponses à donner. */
  questions: string[];
  needsAnswer: boolean;
};

/**
 * Actualités et sondages, du plus récent au plus ancien. Lecture seule :
 * on ne marque rien comme lu, on n'accuse pas réception et on ne répond pas aux sondages.
 * ⚠️ Pas de vérification d'accès ici : à appeler uniquement après `verifySession()`.
 */
export async function getNews(): Promise<NewsEntry[]> {
  "use cache";
  cacheLife("minutes");

  const result = await withPronote((session) => news(session));

  return result.items
    .map((item): NewsEntry => {
      const base = {
        id: item.id,
        title: item.title?.trim() || "Sans titre",
        category: item.category.name,
        author: item.author,
        date: item.startDate.toISOString(),
      };
      if (item.is === "information") {
        return {
          ...base,
          kind: "information",
          text: htmlToText(item.content ?? ""),
          attachments: plainAttachments(item.attachments),
          needsAcknowledgement: item.needToAcknowledge && !item.acknowledged,
          questions: [],
          needsAnswer: false,
        };
      }
      const textParts = item.questions.filter((q) => q.kind === 5 || q.kind === 0).map((q) => htmlToText(q.content));
      return {
        ...base,
        kind: "survey",
        text: textParts.filter(Boolean).join("\n\n"),
        attachments: plainAttachments(item.questions.flatMap((q) => q.attachments)),
        needsAcknowledgement: false,
        questions: item.questions
          .filter((q) => q.kind !== 5 && q.kind !== 0)
          .map((q) => q.title.trim() || htmlToText(q.content))
          .filter(Boolean),
        needsAnswer: item.questions.some((q) => q.shouldAnswer && !q.answered),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
