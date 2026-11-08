import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getNews, type NewsEntry } from "@/lib/pronote/news";
import { formatShortDate } from "@/lib/format";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";
import { ChevronRightIcon, PaperclipIcon } from "@/components/icons";
import { NewsBadges, needsAction } from "@/components/news-badges";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Actualités · Bloomy" };

export default function NewsPage() {
  return (
    <Screen title="Actualités" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<NewsSkeleton />}>
        <NewsList />
      </Suspense>
    </Screen>
  );
}

async function NewsList() {
  await verifySession();

  let items;
  try {
    items = await getNews();
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href="/actualites" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer les actualités depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState illustration={NewsIllustration} title="Aucune actualité">
        Les informations de ton établissement apparaîtront ici.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groupNews(items).map((group) => (
        <section key={group.id} aria-labelledby={group.id} className="flex flex-col gap-2">
          <h2 id={group.id} className="px-1 text-label tracking-wide text-ink-muted uppercase">
            {group.label}
          </h2>
          <ul className="divide-y divide-line overflow-hidden card">
            {group.items.map((n) => (
              <NewsRow key={n.id} n={n} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: SCHOOL_TIME_ZONE });

/**
 * Ce qui attend une action en premier (sinon c'est noyé dans le fil), puis le reste par mois :
 * des repères temporels aident à retrouver une info (« c'était le mois dernier »).
 */
function groupNews(items: NewsEntry[]) {
  const groups: { id: string; label: string; items: NewsEntry[] }[] = [];
  const todo = items.filter(needsAction);
  if (todo.length > 0) groups.push({ id: "actus-a-traiter", label: "À traiter dans Pronote", items: todo });

  for (const n of items) {
    if (needsAction(n)) continue;
    const label = monthFmt.format(new Date(n.date));
    const last = groups.at(-1);
    if (last && last.label === label) last.items.push(n);
    else groups.push({ id: `actus-${groups.length}`, label, items: [n] });
  }
  return groups;
}

/**
 * Aperçu : le texte sans la formule d'appel (« Chers étudiants, »), qui n'apprend rien.
 * L'état « lu » de Pronote n'est pas affiché : Bloomy ne marque rien comme lu, il resterait allumé.
 */
function excerpt(text: string): string {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1 && paragraphs[0].length <= 40 && /[,:]$/.test(paragraphs[0])) paragraphs.shift();
  return paragraphs.join(" ");
}

function NewsRow({ n }: { n: NewsEntry }) {
  const preview = excerpt(n.text);
  return (
    <li>
      <Link
        href={`/actualites/${encodeURIComponent(n.id)}`}
        className="flex min-h-touch items-center gap-3 px-4 py-3.5 hover:bg-bg"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 line-clamp-2 text-body font-semibold">{n.title}</p>
            <p className="shrink-0 text-caption text-ink-muted">{formatShortDate(n.date)}</p>
          </div>
          <p className="mt-0.5 truncate text-caption text-ink-muted">
            {[n.category, n.author].filter(Boolean).join(" · ")}
          </p>
          {preview && <p className="mt-1.5 line-clamp-2 text-callout text-ink-muted">{preview}</p>}
          {(n.attachments.length > 0 || n.kind === "survey" || needsAction(n)) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <NewsBadges n={n} />
              {n.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                  <PaperclipIcon size={14} />
                  {n.attachments.length} pièce{n.attachments.length > 1 ? "s" : ""} jointe
                  {n.attachments.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRightIcon size={16} className="shrink-0 text-ink-muted" />
      </Link>
    </li>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Chargement">
      <div className="h-4 w-28 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="h-72 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
