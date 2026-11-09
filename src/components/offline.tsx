"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Enregistre le service worker (public/sw.js) : les écrans déjà ouverts restent consultables
 * sans réseau. En production seulement, pour ne pas mettre en cache le serveur de développement.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[sw] enregistrement impossible", error);
    });
  }, []);
  return null;
}

/** Efface les écrans gardés hors ligne (page de connexion : déconnexion ou session expirée). */
export function ClearOfflinePages() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    // Filet de sécurité si le service worker ne contrôle pas encore la page.
    if ("caches" in window) {
      caches.keys().then((keys) => keys.filter((k) => k.startsWith("bloomy-pages-")).forEach((k) => caches.delete(k)));
    }
  }, []);
  return null;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/**
 * Bandeau discret quand l'appareil est hors ligne : ce qui est affiché est la dernière version
 * chargée, et les actions (cocher un devoir, actualiser) attendront le retour du réseau.
 */
export function OfflineBanner() {
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-20 border-b border-line bg-warn-soft px-4 py-2 text-center text-caption font-medium text-warn">
      Hors ligne : tu vois les dernières données chargées sur cet appareil.
    </div>
  );
}
