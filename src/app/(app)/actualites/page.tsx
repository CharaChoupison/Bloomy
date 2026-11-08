import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getNews, type NewsEntry } from "@/lib/pronote/news";
import { AttachmentList } from "@/components/attachment-link";
import { Screen } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-3">
      {items.map((n) => (
        <NewsCard key={n.id} n={n} />
      ))}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function NewsCard({ n }: { n: NewsEntry }) {
  return (
    <article className="card px-4 py-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {n.kind === "survey" && <Badge tone="neutral">Sondage</Badge>}
        {n.category && <Badge tone="neutral">{n.category}</Badge>}
        {/* Bloomy est en lecture seule : ces actions se font dans Pronote. */}
        {n.needsAcknowledgement && <Badge tone="warn">À confirmer dans Pronote</Badge>}
        {n.needsAnswer && <Badge tone="warn">Réponds dans Pronote</Badge>}
      </div>
      <h2 className="mt-2 text-headline">{n.title}</h2>
      <p className="mt-0.5 text-caption text-ink-muted">
        {[n.author, dateFmt.format(new Date(n.date))].filter(Boolean).join(" · ")}
      </p>
      {n.text && <p className="mt-3 text-callout break-words whitespace-pre-line">{n.text}</p>}
      {n.questions.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-callout">
          {n.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      )}
      <AttachmentList files={n.attachments} className="mt-2" />
    </article>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
      <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
