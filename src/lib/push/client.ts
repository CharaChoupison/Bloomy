"use client";

// Côté navigateur des notifications : ce que l'appareil permet, et l'abonnement lui-même.
// Partagé par les Réglages › Notifications et l'onboarding, pour qu'ils se comportent pareil.

/** ok : possible ici · install : iPhone hors app installée · dev : serveur de développement. */
export type PushSupport = "ok" | "unsupported" | "install" | "dev";

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Ouverte depuis son icône sur l'écran d'accueil (et non dans un onglet du navigateur). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
  );
}

export function detectPushSupport(): PushSupport {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // Sur iPhone, les notifications web n'existent que pour l'app ajoutée à l'écran d'accueil.
    return isIOS() && !isStandalone() ? "install" : "unsupported";
  }
  return process.env.NODE_ENV === "production" ? "ok" : "dev";
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type DeviceSubscription =
  | { ok: true; subscription: PushSubscriptionJSON }
  | { ok: false; denied: boolean; error: string };

/**
 * Demande la permission puis abonne cet appareil. À appeler au toucher d'un bouton :
 * obligatoire sur iPhone, et c'est là que l'élève comprend pourquoi on la demande.
 */
export async function subscribeDevice(publicKey: string | null): Promise<DeviceSubscription> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        denied: permission === "denied",
        error: "Notifications refusées. Tu peux les autoriser dans les réglages de l'appareil.",
      };
    }
    if (!publicKey) throw new Error("clé du serveur absente");
    // Hors des écrans de l'app (onboarding), le service worker n'est peut-être pas encore enregistré.
    if (!(await navigator.serviceWorker.getRegistration())) {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    const registration = await navigator.serviceWorker.ready;
    const current = await registration.pushManager.getSubscription();
    const sub =
      current ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    return { ok: true, subscription: sub.toJSON() };
  } catch (error) {
    console.warn("[push]", error);
    return { ok: false, denied: false, error: "Impossible d'activer les notifications sur cet appareil." };
  }
}
