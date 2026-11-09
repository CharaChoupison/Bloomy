"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { refreshPronoteData } from "@/app/(app)/refresh-action";

export type RefreshStatus = { kind: "idle" } | { kind: "done" } | { kind: "error"; message: string };

const DONE_FOR_MS = 1600;
const ERROR_FOR_MS = 4000;

/**
 * Actualisation des données Pronote, partagée par le bouton (ordinateur) et le geste
 * « tirer pour actualiser » (écrans tactiles) : même action serveur, mêmes messages.
 * L'état « fait » s'efface seul ; une erreur reste visible un peu plus longtemps.
 */
export function useRefresh() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<RefreshStatus>({ kind: "idle" });

  useEffect(() => {
    if (status.kind === "idle") return;
    const t = setTimeout(() => setStatus({ kind: "idle" }), status.kind === "done" ? DONE_FOR_MS : ERROR_FOR_MS);
    return () => clearTimeout(t);
  }, [status]);

  const refresh = useCallback(() => {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const result = await refreshPronoteData();
        setStatus(result.ok ? { kind: "done" } : { kind: "error", message: result.error });
      } catch {
        setStatus({ kind: "error", message: "Actualisation impossible. Vérifie ta connexion." });
      }
    });
  }, []);

  /** Texte pour une zone role="status" (lecteurs d'écran). */
  const announcement = status.kind === "done" ? "Données à jour" : status.kind === "error" ? status.message : "";

  return { refresh, pending, status, announcement };
}
