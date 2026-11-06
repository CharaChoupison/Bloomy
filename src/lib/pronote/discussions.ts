import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { discussionMessages, discussions, type Discussion } from "pawnote";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";
import { viewerTag } from "./cache-tags";
import { plainAttachments, type PlainAttachment } from "./attachments";
import { htmlToText } from "@/lib/html-to-text";

// Lecture seule : on ne marque jamais une discussion comme lue (markAsRead = false),
// on n'envoie, ne supprime et ne déplace rien.

const TRASH_FOLDER_KIND = 5; // OCEM_Pre_Poubelle

export type ConversationSummary = {
  /** Identifiant stable de la discussion (participantsMessageID de Pronote), utilisé dans l'URL. */
  id: string;
  subject: string;
  /** Interlocuteur : créateur de la discussion, ou destinataire si c'est toi qui l'as créée. */
  with: string;
  date: string; // ISO, dernier message
  messages: number;
  unread: number;
  closed: boolean;
};

export type ConversationMessage = {
  id: string;
  /** undefined = c'est toi. */
  author?: string;
  date: string; // ISO
  text: string;
  files: PlainAttachment[];
};

export type Conversation = ConversationSummary & { thread: ConversationMessage[] };

const visible = (d: Discussion) => !d.folders.some((f) => f.kind === TRASH_FOLDER_KIND);

function summary(d: Discussion): ConversationSummary {
  return {
    id: d.participantsMessageID,
    subject: d.subject.trim() || "Sans objet",
    with: d.creator?.trim() || d.recipientName?.trim() || "",
    date: d.date.toISOString(),
    messages: d.numberOfMessages,
    unread: d.numberOfMessagesUnread,
    closed: d.closed,
  };
}

/**
 * Discussions (hors corbeille), de la plus récente à la plus ancienne.
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
  const viewer = await verifySession();
  return getConversationsFor(viewer.id);
}

async function getConversationsFor(viewerId: string): Promise<ConversationSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));

  const result = await withPronote(viewerId, (session) => discussions(session));
  return result.items
    .filter(visible)
    .map(summary)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Une discussion et ses messages, du plus ancien au plus récent. `null` si elle n'existe pas.
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const viewer = await verifySession();
  return getConversationFor(viewer.id, id);
}

async function getConversationFor(viewerId: string, id: string): Promise<Conversation | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));

  return withPronote(viewerId, async (session) => {
    const list = await discussions(session);
    const discussion = list.items.find((d) => d.participantsMessageID === id && visible(d));
    if (!discussion) return null;

    const messages = await discussionMessages(session, discussion, false); // ne pas marquer comme lu
    const thread = messages.sents
      .map((m) => ({
        id: m.id,
        author: m.author?.name,
        date: m.creationDate.toISOString(),
        text: htmlToText(m.content),
        files: plainAttachments(m.files),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { ...summary(discussion), thread };
  });
}
