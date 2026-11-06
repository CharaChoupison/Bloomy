"use client";

import { useId, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

/**
 * Une ligne « libellé : valeur » du compte. Une valeur sensible est masquée (« •••• ») jusqu'à ce
 * que l'élève appuie sur « Afficher » : protection contre un regard par-dessus l'épaule ou une
 * capture d'écran partagée. `copyable` ajoute « Copier » une fois la valeur visible.
 */
export function SensitiveField({
  label,
  lines,
  sensitive = false,
  copyable = false,
}: {
  label: string;
  /** Une ou plusieurs lignes (adresse). */
  lines: string[];
  sensitive?: boolean;
  copyable?: boolean;
}) {
  const [shown, setShown] = useState(!sensitive);
  const [copied, setCopied] = useState(false);
  const valueId = useId();
  const empty = lines.length === 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-caption text-ink-muted">{label}</p>
        <div id={valueId} className="mt-0.5 text-body break-words">
          {empty ? (
            <span className="text-ink-muted">Non renseigné</span>
          ) : shown ? (
            lines.map((l, i) => <span key={i} className="block">{l}</span>)
          ) : (
            <span aria-label="Valeur masquée" className="tracking-widest text-ink-muted">
              ••••••••
            </span>
          )}
        </div>
      </div>

      {!empty && (
        <div className="flex shrink-0 items-center gap-1 self-center">
          {shown && copyable && (
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-caption font-medium text-accent hover:bg-accent-soft"
            >
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
            </button>
          )}
          {sensitive && (
            <button
              type="button"
              onClick={() => setShown((s) => !s)}
              aria-pressed={shown}
              aria-controls={valueId}
              className="inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-caption font-medium text-accent hover:bg-accent-soft"
            >
              {shown ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              {shown ? "Masquer" : "Afficher"}
              <span className="sr-only"> : {label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
