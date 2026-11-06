"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import type { WidgetStatus } from "@/lib/auth/widget-store";
import { createWidgetCode, disableWidget } from "./actions";

const SCRIPTABLE_URL = "https://apps.apple.com/app/scriptable/id1405459188";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Bouton « Copier » avec retour « Copié » ; `value` est lu au moment du clic. */
function CopyButton({ value, label, variant = "secondary" }: { value: () => string; label: string; variant?: "primary" | "secondary" }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value());
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };
  return (
    <Button variant={variant} onClick={copy} className="self-start">
      {state === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{state === "copied" ? "Copié" : state === "failed" ? "Copie impossible" : label}</span>
    </Button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 px-4 py-4">
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-callout font-semibold text-accent tabular-nums"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h3 className="text-body font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  );
}

export function WidgetSetup({ status, script }: { status: WidgetStatus | null; script: string }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [creating, startCreate] = useTransition();
  const [disabling, startDisable] = useTransition();

  const create = () =>
    startCreate(async () => {
      setError(null);
      const result = await createWidgetCode();
      if (result.ok) {
        setCode(result.code);
        router.refresh(); // met à jour l'état « actif » ci-dessous
      } else {
        setError(result.error);
      }
    });

  const disable = () =>
    startDisable(async () => {
      setError(null);
      const result = await disableWidget();
      if (result.ok) {
        setCode(null);
        setConfirmDisable(false);
        router.refresh();
      } else {
        setError(result.error ?? "Impossible de désactiver le widget.");
      }
    });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body text-ink-muted">
        Ton prochain cours, tes devoirs et ta dernière note sur l&apos;écran d&apos;accueil. Le widget passe par
        l&apos;app gratuite Scriptable. Il fonctionne sur l&apos;écran d&apos;accueil (petit, moyen,
        grand) et sur l&apos;écran verrouillé. Toucher le widget ouvre Bloomy.
      </p>

      {error && <Banner>{error}</Banner>}

      <section aria-labelledby="etapes" className="flex flex-col gap-3">
        <h2 id="etapes" className="text-headline">
          Installation
        </h2>
        <ol className="divide-y divide-line overflow-hidden card">
          <Step n={1} title="Installe Scriptable">
            <a
              href={SCRIPTABLE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-touch items-center gap-2 self-start rounded-md text-callout font-medium text-accent"
            >
              Scriptable sur l&apos;App Store
              <ExternalLinkIcon size={16} />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </Step>

          <Step n={2} title="Ajoute le script Bloomy">
            <CopyButton label="Copier le script" value={() => script.replace("__BLOOMY_URL__", window.location.origin)} />
            <p className="text-callout text-ink-muted">
              Dans Scriptable, touche <strong className="font-semibold text-ink">+</strong>, colle le script, puis
              renomme-le « Bloomy » (touche le titre en haut).
            </p>
          </Step>

          <Step n={3} title="Crée ton code d'accès">
            {code ? (
              <div className="flex flex-col gap-3">
                <p
                  aria-label="Code d'accès"
                  className="rounded-md bg-surface-sunken px-3 py-2 font-mono text-caption break-all select-all"
                >
                  {code}
                </p>
                <CopyButton label="Copier le code" value={() => code} variant="primary" />
                <p className="text-callout text-ink-muted">
                  Lance le script dans Scriptable (touche ▶︎) : il te propose de coller ce code. Il ne sera plus affiché
                  ici ; en cas de perte, crée-en un nouveau.
                </p>
              </div>
            ) : (
              <>
                <Button variant={status ? "secondary" : "primary"} onClick={create} busy={creating} className="self-start">
                  {creating ? "Création…" : status ? "Créer un nouveau code" : "Créer le code d'accès"}
                </Button>
                <p className="text-callout text-ink-muted">
                  {status
                    ? "Un nouveau code remplace l'ancien : le widget devra être réglé à nouveau."
                    : "Le code permet au widget de lire ton emploi du temps, tes devoirs et tes notes, sans pouvoir rien modifier. Ne le partage pas."}
                </p>
              </>
            )}
          </Step>

          <Step n={4} title="Place le widget">
            <p className="text-callout text-ink-muted">
              Appui long sur l&apos;écran d&apos;accueil › <strong className="font-semibold text-ink">Modifier</strong> ›{" "}
              <strong className="font-semibold text-ink">Ajouter un widget</strong> › Scriptable, choisis une taille. Touche
              ensuite le widget et choisis le script « Bloomy ».
            </p>
          </Step>
        </ol>
      </section>

      <section aria-labelledby="acces" className="flex flex-col gap-3">
        <h2 id="acces" className="text-headline">
          Accès du widget
        </h2>
        {status ? (
          <div className="flex flex-col gap-4 card px-4 py-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-callout">
              <dt className="text-ink-muted">État</dt>
              <dd className="flex items-center gap-1.5 font-medium text-success">
                <CheckIcon size={16} />
                Actif
              </dd>
              <dt className="text-ink-muted">Créé le</dt>
              <dd>{dateFmt.format(status.createdAt)}</dd>
              <dt className="text-ink-muted">Dernière mise à jour</dt>
              <dd>{status.lastUsedAt ? dateTimeFmt.format(status.lastUsedAt) : "Pas encore utilisé"}</dd>
              <dt className="text-ink-muted">Valable jusqu&apos;au</dt>
              <dd>{dateFmt.format(status.sessionExpiresAt)}</dd>
            </dl>
            <p className="text-caption text-ink-muted">
              Le widget dépend de ta connexion à Bloomy sur cet appareil : il s&apos;arrête si tu te déconnectes ou
              quand la session expire. Reconnecte-toi puis crée un nouveau code.
            </p>
            {confirmDisable ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={disable} busy={disabling} className="border-danger text-danger hover:border-danger">
                  {disabling ? "Désactivation…" : "Oui, désactiver"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDisable(false)} disabled={disabling}>
                  Annuler
                </Button>
              </div>
            ) : (
              <Button onClick={() => setConfirmDisable(true)} className="self-start">
                Désactiver le widget
              </Button>
            )}
          </div>
        ) : (
          <p className="text-callout text-ink-muted">Aucun widget actif pour le moment.</p>
        )}
      </section>
    </div>
  );
}
