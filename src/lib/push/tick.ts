// Déclenchement de la vérification des notifications : instrumentation.ts appelle /api/push/tick
// sur le serveur lui-même, toutes les 15 minutes. Passer par une requête (plutôt que d'appeler la
// vérification directement depuis instrumentation.ts) la fait tourner dans le contexte normal de Next.
// Pas de "server-only" : importé par instrumentation.ts.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TICK_HEADER = "x-bloomy-tick";
export const TICK_EVERY_MS = 15 * 60 * 1000;

/** Jeton propre à ce serveur (dérivé de APP_SESSION_SECRET), pour que personne d'autre ne déclenche la vérification. */
export function tickToken(): string | null {
  const secret = process.env.APP_SESSION_SECRET;
  return secret && secret.length >= 32 ? createHmac("sha256", secret).update("bloomy-push-tick-v1").digest("base64url") : null;
}

export function isValidTick(value: string | null): boolean {
  const expected = tickToken();
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Démarre les appels périodiques (production, ou PUSH_IN_DEV=1 en développement). */
export function startTicking(): void {
  const store = globalThis as typeof globalThis & { __bloomyPushTimer?: ReturnType<typeof setInterval> };
  if (store.__bloomyPushTimer) return;
  if (process.env.NODE_ENV !== "production" && process.env.PUSH_IN_DEV !== "1") return;
  const token = tickToken();
  if (!token) return;

  const url = `http://127.0.0.1:${process.env.PORT || "3000"}/api/push/tick`;
  const tick = () =>
    fetch(url, { method: "POST", headers: { [TICK_HEADER]: token }, signal: AbortSignal.timeout(10 * 60 * 1000) }).catch(
      (error) => console.warn("[push] vérification non déclenchée :", (error as Error).message),
    );
  // Premier passage une minute après le démarrage (le serveur doit d'abord écouter).
  setTimeout(tick, 60_000).unref();
  store.__bloomyPushTimer = setInterval(tick, TICK_EVERY_MS);
  store.__bloomyPushTimer.unref();
}
