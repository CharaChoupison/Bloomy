import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { formatDuration, getNotebook, type NotebookView } from "@/lib/pronote/notebook";
import { formatShortDate, formatTime } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { SchoolLifeIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Vie scolaire · Bloomy" };

// Lit ?periode=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function SchoolLifePage({ searchParams }: PageProps<"/vie-scolaire">) {
  return (
    <Screen title="Vie scolaire" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<SchoolLifeSkeleton />}>
        <SchoolLife searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}

async function SchoolLife({ searchParams }: Pick<PageProps<"/vie-scolaire">, "searchParams">) {
  await verifySession();
  const { periode } = await searchParams;
  const periodId = typeof periode === "string" ? periode : undefined;

  let nb;
  try {
    nb = await getNotebook(periodId);
  } catch (error) {
    console.error("[pronote]", error);
    const retry = periodId ? `/vie-scolaire?periode=${encodeURIComponent(periodId)}` : "/vie-scolaire";
    return (
      <Banner action={<Link href={retry} className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer ta vie scolaire depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  const empty =
    nb.absences.length + nb.delays.length + nb.punishments.length + nb.observations.length + nb.measures.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PeriodPicker periods={nb.periods} currentId={nb.period.id} basePath="/vie-scolaire" />
      {empty ? (
        <EmptyState illustration={SchoolLifeIllustration} title="Rien à signaler">
          Ni absence, ni retard, ni punition, ni observation pour la période « {nb.period.name} ».
        </EmptyState>
      ) : (
        <>
          <Summary nb={nb} />
          <Absences nb={nb} />
          <Delays nb={nb} />
          <Observations nb={nb} />
          <Punishments nb={nb} />
          <Measures nb={nb} />
        </>
      )}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Résumé chiffré : des mots, pas de couleurs alarmantes. */
function Summary({ nb }: { nb: NotebookView }) {
  const { absenceDays, absenceHours, absenceMinutes, delayMinutes } = nb.totals;
  // Même règle que pour chaque absence : les heures d'abord, les jours seulement à défaut.
  const totalMinutes = absenceHours * 60 + absenceMinutes;
  const missed =
    totalMinutes > 0
      ? formatDuration(0, Math.floor(totalMinutes / 60), totalMinutes % 60)
      : absenceDays > 0
        ? plural(absenceDays, "jour")
        : "";
  const tiles = [
    { label: "Absences", value: nb.absences.length, detail: missed ? `Total : ${missed}` : undefined },
    { label: "Retards", value: nb.delays.length, detail: delayMinutes ? `${delayMinutes} min au total` : undefined },
    { label: "Punitions", value: nb.punishments.length },
    { label: "Observations", value: nb.observations.length },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Résumé de la période">
      {tiles.map((t) => (
        <li key={t.label} className="card px-4 py-3">
          <p className="text-caption text-ink-muted">{t.label}</p>
          <p className="mt-0.5 font-mono text-[1.5rem] leading-none font-medium tabular-nums">{t.value}</p>
          {t.detail && <p className="mt-1 text-caption text-ink-muted">{t.detail}</p>}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  const id = `section-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-headline">
        {title}
      </h2>
      <ul className="divide-y divide-line overflow-hidden card">{children}</ul>
    </section>
  );
}

function JustificationBadges({ justified, toJustify }: { justified: boolean; toJustify: boolean }) {
  if (justified) return <Badge tone="neutral">Justifiée</Badge>;
  return (
    <>
      <Badge tone="danger">Non justifiée</Badge>
      {toJustify && <Badge tone="warn">À justifier</Badge>}
    </>
  );
}

const Reason = ({ reason }: { reason?: string }) => (
  <p className={`mt-0.5 text-caption ${reason ? "text-ink" : "text-ink-muted"}`}>{reason ?? "Motif non précisé"}</p>
);

function Absences({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Absences" count={nb.absences.length}>
      {nb.absences.map((a) => (
        <li key={a.id} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body font-semibold">
              {formatShortDate(a.start)}
              <span className="font-normal text-ink-muted">
                {" "}
                · {formatTime(a.start)} – {formatShortDate(a.end) !== formatShortDate(a.start) && `${formatShortDate(a.end)} `}
                {formatTime(a.end)}
              </span>
            </p>
            <p className="shrink-0 font-mono text-caption font-medium tabular-nums">{a.duration}</p>
          </div>
          <Reason reason={a.reason} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <JustificationBadges justified={a.justified} toJustify={a.toJustify} />
          </div>
        </li>
      ))}
    </Section>
  );
}

function Delays({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Retards" count={nb.delays.length}>
      {nb.delays.map((d) => (
        <li key={d.id} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body font-semibold">
              {formatShortDate(d.date)} <span className="font-normal text-ink-muted">· {formatTime(d.date)}</span>
            </p>
            <p className="shrink-0 font-mono text-caption font-medium tabular-nums">{d.minutes} min</p>
          </div>
          <Reason reason={d.reason} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <JustificationBadges justified={d.justified} toJustify={d.toJustify} />
          </div>
        </li>
      ))}
    </Section>
  );
}

const OBSERVATION_KINDS: Record<number, string> = { 0: "Défaut de carnet", 1: "Observation", 2: "Encouragement", 3: "Autre" };

function Observations({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Observations" count={nb.observations.length}>
      {nb.observations.map((o) => (
        <li key={o.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={o.kind === 2 ? "success" : "neutral"}>{OBSERVATION_KINDS[o.kind] ?? "Observation"}</Badge>
            <p className="text-caption text-ink-muted">
              {[formatShortDate(o.date), o.subject].filter(Boolean).join(" · ")}
            </p>
          </div>
          <p className="mt-1 text-body font-semibold">{o.name}</p>
          {o.comment && <p className="mt-0.5 text-callout whitespace-pre-line">{o.comment}</p>}
        </li>
      ))}
    </Section>
  );
}

function Punishments({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Punitions" count={nb.punishments.length}>
      {nb.punishments.map((p) => (
        <li key={p.id} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body font-semibold">{p.title}</p>
            {p.durationMinutes > 0 && (
              <p className="shrink-0 font-mono text-caption font-medium tabular-nums">{p.durationMinutes} min</p>
            )}
          </div>
          <p className="mt-0.5 text-caption text-ink-muted">
            {[formatShortDate(p.date), p.giver].filter(Boolean).join(" · ")}
          </p>
          {p.reasons.length > 0 && <p className="mt-1 text-callout">{p.reasons.join(", ")}</p>}
          {p.workToDo && <p className="mt-1 text-callout whitespace-pre-line">Travail demandé : {p.workToDo}</p>}
          {p.exclusion && (
            <div className="mt-1.5">
              <Badge tone="danger">Exclusion</Badge>
            </div>
          )}
        </li>
      ))}
    </Section>
  );
}

function Measures({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Mesures conservatoires" count={nb.measures.length}>
      {nb.measures.map((m) => (
        <li key={m.id} className="px-4 py-3">
          <p className="text-body font-semibold">{m.title}</p>
          <p className="mt-0.5 text-caption text-ink-muted">
            Du {formatShortDate(m.start)} au {formatShortDate(m.end)}
          </p>
          {m.reasons.length > 0 && <p className="mt-1 text-callout">{m.reasons.join(", ")}</p>}
        </li>
      ))}
    </Section>
  );
}

function SchoolLifeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-60 animate-pulse rounded-md bg-surface-sunken" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-sunken" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
