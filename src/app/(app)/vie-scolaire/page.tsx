import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { formatMinutes, getNotebook, missedTime, type NotebookView } from "@/lib/pronote/notebook";
import { formatShortDate, formatTime } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import { Screen } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Banner, bannerActionClasses } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { SchoolLifeIllustration } from "@/components/illustrations";
import { AlertCircleIcon, CheckIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Vie scolaire · Bloomy" };

// Lit ?periode=… (donnée de requête) : rendu derrière <Suspense>, comme l'exige cacheComponents.
export default function SchoolLifePage({ searchParams }: PageProps<"/vie-scolaire">) {
  return (
    <Screen refresh title="Vie scolaire" back={{ href: "/plus", label: "Plus" }}>
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
          <Attendance nb={nb} />
          <Observations nb={nb} />
          <Punishments nb={nb} />
          <Measures nb={nb} />
        </>
      )}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Pronote renvoie parfois les motifs en capitales (« MAIL ELEVE ») : on les remet en phrase. */
function readableReason(reason?: string) {
  if (!reason) return undefined;
  if (reason !== reason.toUpperCase() || !/\p{L}/u.test(reason)) return reason;
  const lower = reason.toLocaleLowerCase("fr-FR");
  return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1);
}

/** « 1 absence et 2 retards non justifiés » : accord sur ce qui est compté. */
function unjustifiedLabel(absences: number, delays: number) {
  const parts = [absences && plural(absences, "absence"), delays && plural(delays, "retard")].filter(Boolean);
  const many = absences + delays > 1;
  const feminine = delays === 0;
  return `${parts.join(" et ")} non justifié${feminine ? "e" : ""}${many ? "s" : ""}`;
}

/**
 * Résumé de la période : le temps de cours manqué (absences + retards) en chiffre principal,
 * le détail absences / retards dessous, puis l'état des justifications, seul point qui peut demander une action.
 * Punitions et observations n'apparaissent que s'il y en a : un « 0 » ne dit rien d'utile.
 */
function Summary({ nb }: { nb: NotebookView }) {
  const t = missedTime(nb.absences, nb.delays);
  const days = t.daysOnly > 0 ? plural(t.daysOnly, "jour") : "";
  // Absences sans horaire : on ne devine pas les heures, on ajoute les jours tels que Pronote les donne.
  const total = t.totalMinutes > 0 ? formatMinutes(t.totalMinutes) + (days ? ` + ${days}` : "") : days || "0 h";
  const absenceTime = t.absenceMinutes > 0 ? formatMinutes(t.absenceMinutes) + (days ? ` + ${days}` : "") : days || "0 h";
  const delayTime = nb.delays.length ? formatMinutes(nb.delays.reduce((s, d) => s + d.minutes, 0)) : "0 min";

  const unjustifiedAbsences = nb.absences.filter((a) => !a.justified).length;
  const unjustifiedDelays = nb.delays.filter((d) => !d.justified).length;
  const allJustified = unjustifiedAbsences + unjustifiedDelays === 0;
  const hasAttendance = nb.absences.length + nb.delays.length > 0;

  const others = [
    nb.punishments.length > 0 && plural(nb.punishments.length, "punition"),
    nb.observations.length > 0 && plural(nb.observations.length, "observation"),
    nb.measures.length > 0 && `${nb.measures.length} mesure${nb.measures.length > 1 ? "s" : ""} conservatoire${nb.measures.length > 1 ? "s" : ""}`,
  ].filter(Boolean);

  const figures = [
    { label: "Absences", value: absenceTime, detail: nb.absences.length ? plural(nb.absences.length, "absence") : "Aucune" },
    { label: "Retards", value: delayTime, detail: nb.delays.length ? plural(nb.delays.length, "retard") : "Aucun" },
  ];

  return (
    <section aria-label={`Résumé · ${nb.period.name}`} className="overflow-hidden card">
      <div className="px-5 pt-4 pb-3">
        <p className="text-callout text-ink-muted">Temps de cours manqué</p>
        <p className="mt-1 text-display tabular-nums">{total}</p>
        {t.overlapMinutes > 0 && (
          <p className="mt-0.5 text-caption text-ink-muted">
            Retard pendant une absence compté une seule fois
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 divide-x divide-line border-t border-line">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col px-5 py-3">
            <dt className="text-caption text-ink-muted">{f.label}</dt>
            <dd className="text-headline tabular-nums">{f.value}</dd>
            <dd className="text-caption text-ink-muted">{f.detail}</dd>
          </div>
        ))}
      </dl>
      {hasAttendance && (
        <p
          className={`flex items-center gap-2 px-5 py-3 text-callout font-semibold ${
            allJustified ? "border-t border-line text-success" : "bg-warn-soft text-warn"
          }`}
        >
          {allJustified ? <CheckIcon size={18} /> : <AlertCircleIcon size={18} />}
          {allJustified ? "Tout est justifié" : unjustifiedLabel(unjustifiedAbsences, unjustifiedDelays)}
        </p>
      )}
      {others.length > 0 && (
        <p className="border-t border-line px-5 py-3 text-callout text-ink-muted">{others.join(" · ")}</p>
      )}
    </section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
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

/** Repère de date en tête de ligne : le jour en grand, le mois dessous (comme une page d'agenda). */
function DateMark({ iso }: { iso: string }) {
  const [day, month] = formatShortDate(iso).split(" ");
  return (
    <time dateTime={iso} className="flex w-10 shrink-0 flex-col items-center pt-0.5 leading-none">
      <span className="text-headline tabular-nums">{day}</span>
      <span className="mt-0.5 text-label font-medium text-ink-muted">{month}</span>
    </time>
  );
}

/** Ligne d'historique commune : repère de date, titre + valeur à droite, détails dessous. */
function Row({
  date,
  title,
  value,
  children,
}: {
  date: string;
  title: React.ReactNode;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <DateMark iso={date} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-body font-semibold">{title}</p>
          {value && <p className="shrink-0 text-callout font-semibold tabular-nums">{value}</p>}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * Un seul état par ligne, en mots : « À justifier » (action possible) prime sur « Non justifiée ».
 * Même ton « warn » que le résumé : c'est à régulariser, pas une alerte (« danger » reste pour l'exclusion).
 */
function JustificationBadge({ justified, toJustify, feminine }: { justified: boolean; toJustify: boolean; feminine: boolean }) {
  const e = feminine ? "e" : "";
  if (justified) return <Badge tone="neutral">Justifié{e}</Badge>;
  if (toJustify) return <Badge tone="warn">À justifier</Badge>;
  return <Badge tone="warn">Non justifié{e}</Badge>;
}

type AttendanceEntry =
  | { type: "absence"; date: string; item: NotebookView["absences"][number] }
  | { type: "delay"; date: string; item: NotebookView["delays"][number] };

/**
 * Absences et retards dans une seule liste chronologique : l'élève lit sa période d'un trait,
 * sans répéter les totaux déjà donnés par le résumé.
 */
function Attendance({ nb }: { nb: NotebookView }) {
  const entries: AttendanceEntry[] = [
    ...nb.absences.map((a) => ({ type: "absence" as const, date: a.start, item: a })),
    ...nb.delays.map((d) => ({ type: "delay" as const, date: d.date, item: d })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Section title="Absences et retards" count={entries.length}>
      {entries.map((e) => {
        if (e.type === "absence") {
          const a = e.item;
          const sameDay = formatShortDate(a.start) === formatShortDate(a.end);
          const when = sameDay
            ? `${formatTime(a.start)} – ${formatTime(a.end)}`
            : `Jusqu'au ${formatShortDate(a.end)}, ${formatTime(a.end)}`;
          return (
            <Row key={`a-${a.id}`} date={a.start} title="Absence" value={a.duration}>
              <Details when={when} reason={a.reason} />
              <div className="mt-1.5">
                <JustificationBadge justified={a.justified} toJustify={a.toJustify} feminine />
              </div>
            </Row>
          );
        }
        const d = e.item;
        return (
          <Row key={`d-${d.id}`} date={d.date} title="Retard" value={`${d.minutes} min`}>
            <Details when={`À ${formatTime(d.date)}`} reason={d.reason} />
            <div className="mt-1.5">
              <JustificationBadge justified={d.justified} toJustify={d.toJustify} feminine={false} />
            </div>
          </Row>
        );
      })}
    </Section>
  );
}

/** Horaire puis motif ; un motif absent n'est pas affiché (le badge dit déjà l'essentiel). */
const Details = ({ when, reason }: { when: string; reason?: string }) => (
  <p className="mt-0.5 text-caption text-ink-muted">
    <span className="tabular-nums">{when}</span>
    {reason && <> · {readableReason(reason)}</>}
  </p>
);

const OBSERVATION_KINDS: Record<number, string> = { 0: "Défaut de carnet", 1: "Observation", 2: "Encouragement", 3: "Autre" };

function Observations({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Observations" count={nb.observations.length}>
      {nb.observations.map((o) => (
        <Row key={o.id} date={o.date} title={o.name}>
          {o.subject && <p className="mt-0.5 text-caption text-ink-muted">{o.subject}</p>}
          {o.comment && <p className="mt-1 text-callout whitespace-pre-line">{o.comment}</p>}
          <div className="mt-1.5">
            <Badge tone={o.kind === 2 ? "success" : "neutral"}>{OBSERVATION_KINDS[o.kind] ?? "Observation"}</Badge>
          </div>
        </Row>
      ))}
    </Section>
  );
}

function Punishments({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Punitions" count={nb.punishments.length}>
      {nb.punishments.map((p) => (
        <Row key={p.id} date={p.date} title={p.title} value={p.durationMinutes > 0 ? `${p.durationMinutes} min` : undefined}>
          {p.giver && <p className="mt-0.5 text-caption text-ink-muted">{p.giver}</p>}
          {p.reasons.length > 0 && <p className="mt-1 text-callout">{p.reasons.join(", ")}</p>}
          {p.workToDo && <p className="mt-1 text-callout whitespace-pre-line">Travail demandé : {p.workToDo}</p>}
          {p.exclusion && (
            <div className="mt-1.5">
              <Badge tone="danger">Exclusion</Badge>
            </div>
          )}
        </Row>
      ))}
    </Section>
  );
}

function Measures({ nb }: { nb: NotebookView }) {
  return (
    <Section title="Mesures conservatoires" count={nb.measures.length}>
      {nb.measures.map((m) => (
        <Row key={m.id} date={m.start} title={m.title}>
          <p className="mt-0.5 text-caption text-ink-muted">Jusqu&apos;au {formatShortDate(m.end)}</p>
          {m.reasons.length > 0 && <p className="mt-1 text-callout">{m.reasons.join(", ")}</p>}
        </Row>
      ))}
    </Section>
  );
}

function SchoolLifeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div className="h-11 w-60 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-36 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-48 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
