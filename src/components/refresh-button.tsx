"use client";

import { AlertCircleIcon, CheckIcon, RefreshCwIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { useRefresh } from "@/lib/use-refresh";

/**
 * Bouton « Actualiser » de l'en-tête, sur ordinateur seulement : sur écran tactile, c'est le geste
 * « tirer pour actualiser » (components/pull-to-refresh.tsx) qui s'en charge.
 *
 * Utile même avec Ctrl+R : recharger la page ressert les données en cache (quelques minutes),
 * alors que ce bouton redemande tout à Pronote.
 */
export function RefreshButton() {
  const { refresh, pending, status, announcement } = useRefresh();

  return (
    <div className="hidden shrink-0 items-center gap-2 pointer-fine:flex">
      {status.kind === "error" && (
        <p className="flex max-w-56 items-start gap-1 text-caption text-danger">
          <AlertCircleIcon size={16} className="mt-px shrink-0" />
          {status.message}
        </p>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={pending ? "Actualisation…" : "Actualiser"}
        title="Actualiser"
        className={`${buttonClasses("icon")} pressable disabled:opacity-100`}
      >
        {status.kind === "done" && !pending ? (
          <CheckIcon size={20} strokeWidth={2.5} className="pop text-success" />
        ) : (
          <RefreshCwIcon size={20} className={pending ? "motion-safe:animate-spin" : undefined} />
        )}
      </button>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
