import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getConversations, type ConversationSummary } from "@/lib/pronote/discussions";
import { getNews, type NewsEntry } from "@/lib/pronote/news";
import { formatShortDate } from "@/lib/format";
import { ChevronRightIcon, MailIcon, NewspaperIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { DashboardNote, DashboardSection } from "./section";

const MAX_UNREAD = 3;
const MAX_NEWS = 3;

/**
 * Messages non lus et actualités récentes. Les deux sources sont indépendantes :
 * si l'une ne répond pas, on affiche l'autre et on signale le manque.
 */
export async function InboxWidget({ className }: { className?: string }) {
  await verifySession();

  const [conversations, news] = await Promise.all([
    getConversations().catch((error) => (console.error("[pronote]", error), null)),
    getNews().catch((error) => (console.error("[pronote]", error), null)),
  ]);

  const unread = (conversations ?? []).filter((c) => c.unread > 0).slice(0, MAX_UNREAD);
  const latestNews = (news ?? []).slice(0, MAX_NEWS);
  const failed = [conversations === null && "la messagerie", news === null && "les actualités"].filter(Boolean);

  return (
    <DashboardSection
      id="accueil-infos"
      title="Messages et actualités"
      more={{ href: "/actualites", label: "Actualités" }}
      className={className}
    >
      {unread.length === 0 && latestNews.length === 0 ? (
        <DashboardNote>
          {failed.length === 2 ? "Messagerie et actualités indisponibles pour le moment." : "Rien de nouveau."}
        </DashboardNote>
      ) : (
        <ul className="divide-y divide-line overflow-hidden card">
          {unread.map((c) => (
            <ConversationLine key={c.id} c={c} />
          ))}
          {latestNews.map((n) => (
            <NewsLine key={n.id} n={n} />
          ))}
        </ul>
      )}
      {conversations !== null && unread.length === 0 && (latestNews.length > 0 || failed.length > 0) && (
        <p className="text-caption text-ink-muted">Aucun message non lu.</p>
      )}
      {failed.length === 1 && <p className="text-caption text-ink-muted">Impossible de récupérer {failed[0]}.</p>}
    </DashboardSection>
  );
}

function Line({
  href,
  icon,
  title,
  meta,
  date,
  badge,
  strong = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
  date: string;
  badge?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-bg">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className={`min-w-0 truncate text-body ${strong ? "font-semibold" : "font-medium"}`}>{title}</p>
            <p className="shrink-0 text-caption text-ink-muted">{formatShortDate(date)}</p>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">{meta}</p>
            {badge}
          </div>
        </div>
        <ChevronRightIcon size={16} className="text-ink-muted" />
      </Link>
    </li>
  );
}

function ConversationLine({ c }: { c: ConversationSummary }) {
  return (
    <Line
      href={`/messagerie/${encodeURIComponent(c.id)}`}
      icon={<MailIcon size={18} />}
      title={c.subject}
      meta={c.with || "Messagerie"}
      date={c.date}
      strong
      badge={<Badge tone="neutral">{`${c.unread} non lu${c.unread > 1 ? "s" : ""}`}</Badge>}
    />
  );
}

function NewsLine({ n }: { n: NewsEntry }) {
  const badge = n.needsAnswer ? (
    <Badge tone="warn">À répondre</Badge>
  ) : n.needsAcknowledgement ? (
    <Badge tone="warn">À confirmer</Badge>
  ) : undefined;
  return (
    <Line
      href={`/actualites/${encodeURIComponent(n.id)}`}
      icon={<NewspaperIcon size={18} />}
      title={n.title}
      meta={[n.kind === "survey" ? "Sondage" : n.category, n.author].filter(Boolean).join(" · ")}
      date={n.date}
      badge={badge}
    />
  );
}
