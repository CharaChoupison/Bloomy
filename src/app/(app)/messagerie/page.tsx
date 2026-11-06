import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getConversations } from "@/lib/pronote/discussions";
import { ChevronRightIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Messagerie · Bloomy" };

export default function MessagesPage() {
  return (
    <Screen title="Messagerie" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<MessagesSkeleton />}>
        <ConversationList />
      </Suspense>
    </Screen>
  );
}

async function ConversationList() {
  await verifySession();

  let conversations;
  try {
    conversations = await getConversations();
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href="/messagerie" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer ta messagerie depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="card px-4 py-3 text-callout text-ink-muted">
        Aucune discussion pour le moment. Les messages de tes profs apparaîtront ici.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden card">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messagerie/${encodeURIComponent(c.id)}`}
            className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-bg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`min-w-0 truncate text-body ${c.unread > 0 ? "font-semibold" : "font-medium"}`}>
                  {c.subject}
                </p>
                <p className="shrink-0 text-caption text-ink-muted">{formatShortDate(c.date)}</p>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">
                  {[c.with, `${c.messages} message${c.messages > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                </p>
                {c.closed && <Badge tone="neutral">Fermée</Badge>}
                {c.unread > 0 && <Badge tone="neutral">{`${c.unread} non lu${c.unread > 1 ? "s" : ""}`}</Badge>}
              </div>
            </div>
            <ChevronRightIcon size={16} className="text-ink-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MessagesSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-lg bg-surface-sunken" aria-busy="true" aria-label="Chargement" />
  );
}
