import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getNewsEntry } from "@/lib/pronote/news";
import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";
import { AttachmentList } from "@/components/attachment-link";
import { NewsBadges } from "@/components/news-badges";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";

export const metadata: Metadata = { title: "Actualité · Bloomy" };

const back = { href: "/actualites", label: "Actualités" };

// L'identifiant vient de l'URL (donnée de requête) : rendu derrière <Suspense>.
export default function NewsDetailPage({ params }: PageProps<"/actualites/[id]">) {
  return (
    <Suspense fallback={<NewsDetailSkeleton />}>
      <NewsDetail params={params} />
    </Suspense>
  );
}

const longDateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: SCHOOL_TIME_ZONE,
});

async function NewsDetail({ params }: Pick<PageProps<"/actualites/[id]">, "params">) {
  await verifySession();
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let n;
  try {
    n = await getNewsEntry(id);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Screen title="Actualité" back={back}>
        <Banner action={<Link href={`/actualites/${rawId}`} className={bannerActionClasses}>Réessayer</Link>}>
          Impossible de récupérer cette actualité depuis Pronote. Réessaie dans un instant.
        </Banner>
      </Screen>
    );
  }

  if (!n) {
    return (
      <Screen title="Actualité introuvable" back={back}>
        <p className="card px-4 py-3 text-callout text-ink-muted">
          Cette actualité n&apos;est plus publiée sur Pronote.{" "}
          <Link href="/actualites" className="font-medium text-accent underline-offset-2 hover:underline">
            Voir toutes les actualités
          </Link>
        </p>
      </Screen>
    );
  }

  const paragraphs = n.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <Screen title={n.title} subtitle={n.category || undefined} back={back}>
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-callout text-ink-muted">
          {n.author && <span className="font-medium text-ink">{n.author}</span>}
          {n.author && " · "}
          <time dateTime={n.date}>{longDateFmt.format(new Date(n.date))}</time>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <NewsBadges n={n} />
        </div>
      </div>

      {(n.needsAcknowledgement || n.needsAnswer) && (
        <div className="mb-4">
          <Banner tone="warn">
            {n.needsAnswer
              ? "Ce sondage attend ta réponse. Réponds-y dans Pronote : Bloomy l'affiche en lecture seule."
              : "Cette information demande un accusé de réception. Confirme-la dans Pronote : Bloomy l'affiche en lecture seule."}
          </Banner>
        </div>
      )}

      <article className="card px-5 py-5 sm:px-7 sm:py-6">
        {paragraphs.length > 0 ? (
          // Colonne de ~65 caractères et interligne aéré : le confort de lecture d'un texte long.
          <div className="flex max-w-[65ch] flex-col gap-4 text-body leading-relaxed break-words">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        ) : (
          n.questions.length === 0 && <p className="text-callout text-ink-muted">Cette actualité n&apos;a pas de texte.</p>
        )}

        {n.questions.length > 0 && (
          <section aria-labelledby="actu-questions" className={paragraphs.length > 0 ? "mt-6" : ""}>
            <h2 id="actu-questions" className="text-headline">
              Questions
            </h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-body">
              {n.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </section>
        )}

        {n.attachments.length > 0 && (
          <section aria-labelledby="actu-pj" className="mt-6 border-t border-line pt-4">
            <h2 id="actu-pj" className="text-label tracking-wide text-ink-muted uppercase">
              Pièces jointes
            </h2>
            <AttachmentList files={n.attachments} className="mt-1" />
          </section>
        )}
      </article>
    </Screen>
  );
}

function NewsDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-content flex-1 px-4 pt-8 pb-12 sm:px-6" aria-busy="true" aria-label="Chargement">
      <div className="mb-3 h-4 w-24 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="mb-6 h-8 w-3/4 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="h-80 animate-pulse rounded-lg bg-surface-sunken" />
    </main>
  );
}
