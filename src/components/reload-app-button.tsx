"use client";

import { useState } from "react";
import { RefreshCwIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * Recharge complètement l'app. Utile quand elle est ajoutée à l'écran d'accueil :
 * en mode « app » il n'y a ni barre d'adresse ni geste de rafraîchissement fiable.
 * On vide d'abord les caches du navigateur (Cache Storage, service workers éventuels)
 * pour être sûr de récupérer la dernière version publiée.
 */
export function ReloadAppButton() {
  const [busy, setBusy] = useState(false);

  async function reload() {
    setBusy(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {
      // Le nettoyage est un bonus : on recharge quoi qu'il arrive.
    }
    window.location.reload();
  }

  return (
    <Button onClick={reload} busy={busy} disabled={busy} className="self-start">
      {!busy && <RefreshCwIcon />}
      {busy ? "Rechargement…" : "Recharger l'app"}
    </Button>
  );
}
