import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getConversation } from "@/lib/pronote/discussions";
import { AttachmentList } from "@/components/attachment-link";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { formatShortDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Discussion · Pronoti" };

// L'identifiant de la discussion vient de l'URL (donnée de requête) : rendu derrière <Suspense>.
export default function ConversationPage({ params }: PageProps<"/messagerie/[id]">) {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <ConversationView params={params} />
    </Suspense>
  );
}

async function ConversationView({ params }: Pick<PageProps<"/messagerie/[id]">, "params">) {
  await verifySession();
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const back = { href: "/messagerie", label: "Messagerie" };

  let conversation;
  try {
    conversation = await getConversation(id);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Screen title="Discussion" back={back}>
        <Banner action={<Link href={`/messagerie/${rawId}`} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer cette discussion depuis Pronote. Réessaie dans un instant.
        </Banner>
      </Screen>
    );
  }

  if (!conversation) {
    return (
      <Screen title="Discussion introuvable" back={back}>
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-callout text-ink-muted">
          Cette discussion n&apos;existe plus ou a été déplacée dans la corbeille de Pronote.
        </p>
      </Screen>
    );
  }

  return (
    <Screen title={conversation.subject} subtitle={conversation.with || undefined} back={back}>
      <ol className="flex flex-col gap-3">
        {conversation.thread.map((m) => {
          const mine = !m.author;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              {/* Pas d'accent ici : le Design System le réserve à l'action et à l'état courant. */}
              <article
                className={`max-w-[85%] min-w-0 rounded-lg px-4 py-3 ${
                  mine ? "bg-surface-sunken" : "border border-line bg-surface"
                }`}
              >
                <p className="text-caption text-ink-muted">
                  <span className="font-semibold text-ink">{mine ? "Toi" : m.author}</span>
                  {" · "}
                  {formatShortDate(m.date)} à {formatTime(m.date)}
                </p>
                {m.text && <p className="mt-1 text-callout break-words whitespace-pre-line">{m.text}</p>}
                <AttachmentList files={m.files} className="mt-1" />
              </article>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-center text-caption text-ink-muted">
        {conversation.closed
          ? "Cette discussion est fermée."
          : "Pour répondre, utilise Pronote : Pronoti affiche la messagerie en lecture seule."}
      </p>
    </Screen>
  );
}

function ConversationSkeleton() {
  return (
    <main className="mx-auto w-full max-w-content flex-1 px-4 pt-8 sm:px-6" aria-busy="true" aria-label="Chargement">
      <div className="mb-6 h-9 w-2/3 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="flex flex-col gap-3">
        <div className="h-24 w-4/5 animate-pulse rounded-lg bg-surface-sunken" />
        <div className="ml-auto h-16 w-3/5 animate-pulse rounded-lg bg-surface-sunken" />
      </div>
    </main>
  );
}
