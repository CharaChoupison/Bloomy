import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getResourceLibrary, type ResourceItem } from "@/lib/pronote/library";
import { toDateKey } from "@/lib/pronote/timetable";
import { downloadHref } from "@/lib/download";
import { formatShortDate } from "@/lib/format";
import { DownloadIcon, ExternalLinkIcon, FileTextIcon, LinkIcon } from "@/components/icons";
import { SubjectBar } from "@/components/grades";
import { SegmentedLinks } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Ressources · Bloomy" };

// Tous les fichiers et liens des profs, au même endroit : ceux des devoirs à venir,
// puis ceux du contenu des cours, du plus récent au plus ancien.
// ?matiere=<nom> filtre par matière ; ?semaines=<n> remonte plus loin dans le temps.
export default function ResourcesPage({ searchParams }: PageProps<"/ressources">) {
  return (
    <Screen title="Ressources" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<ResourcesSkeleton />}>
        <Resources searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

const DEFAULT_WEEKS = 8;
const STEP_WEEKS = 8;
const MAX_WEEKS = 52;

function hrefFor(subject: string | undefined, weeks: number) {
  const params = new URLSearchParams();
  if (subject) params.set("matiere", subject);
  if (weeks !== DEFAULT_WEEKS) params.set("semaines", String(weeks));
  const query = params.toString();
  return query ? `/ressources?${query}` : "/ressources";
}

async function Resources({ searchParams }: Pick<PageProps<"/ressources">, "searchParams">) {
  await verifySession(); // signale aussi que la date du jour est celle de la requête

  const { matiere, semaines } = await searchParams;
  const weeks = Math.max(1, Math.min(MAX_WEEKS, Number.parseInt(String(semaines ?? DEFAULT_WEEKS), 10) || DEFAULT_WEEKS));

  let library;
  try {
    library = await getResourceLibrary(toDateKey(new Date()), weeks);
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href={hrefFor(undefined, weeks)} className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer les ressources depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  // Une matière inconnue (lien ancien, faute de frappe) revient simplement à « Toutes ».
  const subject = library.subjects.some((s) => s.name === matiere) ? (matiere as string) : undefined;
  const items = subject ? library.items.filter((i) => i.subject === subject) : library.items;
  const forAssignments = items.filter((i) => i.origin === "devoir");
  const fromLessons = items.filter((i) => i.origin === "cours");
  const period = `les ${weeks} dernières semaines`;

  return (
    <div className="flex flex-col gap-6">
      {library.subjects.length > 1 && (
        <SegmentedLinks
          label="Matière"
          currentKey={subject ?? ""}
          items={[
            { key: "", label: `Toutes · ${library.items.length}`, href: hrefFor(undefined, weeks) },
            ...library.subjects.map((s) => ({ key: s.name, label: `${s.name} · ${s.count}`, href: hrefFor(s.name, weeks) })),
          ]}
        />
      )}

      {items.length === 0 ? (
        <p className="card px-4 py-3 text-callout text-ink-muted">
          Aucun fichier ni lien déposé sur {period}, ni dans tes devoirs à venir.
        </p>
      ) : (
        <>
          {forAssignments.length > 0 && (
            <ResourceSection id="ressources-devoirs" title="Pour tes devoirs à venir" items={forAssignments} showSubject={!subject} />
          )}
          {fromLessons.length > 0 && (
            <ResourceSection id="ressources-cours" title="Contenu des cours" items={fromLessons} showSubject={!subject} />
          )}
        </>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-caption text-ink-muted">Cours des {weeks} dernières semaines.</p>
        {weeks < MAX_WEEKS && (
          <Link href={hrefFor(subject, Math.min(MAX_WEEKS, weeks + STEP_WEEKS))} scroll={false} className={buttonClasses("ghost")}>
            Remonter {STEP_WEEKS} semaines plus loin
          </Link>
        )}
      </div>
    </div>
  );
}

function ResourceSection({
  id,
  title,
  items,
  showSubject,
}: {
  id: string;
  title: string;
  items: ResourceItem[];
  showSubject: boolean;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-callout font-semibold">
        {title}
      </h2>
      <ul className="divide-y divide-line overflow-hidden card">
        {items.map((item) => (
          <ResourceRow key={item.key} item={item} showSubject={showSubject} />
        ))}
      </ul>
    </section>
  );
}

function ResourceRow({ item, showSubject }: { item: ResourceItem; showSubject: boolean }) {
  const { file } = item;
  const meta = [showSubject && item.subject, item.origin === "cours" && formatShortDate(item.date)].filter(Boolean).join(" · ");

  return (
    <li className="flex items-center gap-3 py-2 pr-2 pl-4">
      <SubjectBar color={item.color} />
      <div className="min-w-0 flex-1 py-1">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-start gap-1.5 rounded-sm text-body font-semibold underline-offset-2 hover:underline"
        >
          <span className="mt-px text-ink-muted">{file.isLink ? <LinkIcon size={18} /> : <FileTextIcon size={18} />}</span>
          <span className="min-w-0 break-words">{file.name}</span>
          <span className="sr-only"> ({file.isLink ? "lien" : "fichier"}, s&apos;ouvre dans un nouvel onglet)</span>
        </a>
        <p className="mt-0.5 text-caption text-ink-muted">
          {meta && `${meta} · `}
          <Link href={item.sourceHref} className="font-medium text-accent underline-offset-2 hover:underline">
            {item.context}
          </Link>
        </p>
      </div>
      {file.isLink ? (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClasses("icon")} shrink-0 text-ink-muted`}
          aria-label={`Ouvrir le lien ${file.name}`}
          title="Ouvrir le lien"
        >
          <ExternalLinkIcon size={18} />
        </a>
      ) : (
        <a
          href={downloadHref(file.url)}
          download
          className={`${buttonClasses("icon")} shrink-0`}
          aria-label={`Télécharger ${file.name}`}
          title="Télécharger"
        >
          <DownloadIcon size={18} />
        </a>
      )}
    </li>
  );
}

function ResourcesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-72 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-56 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
