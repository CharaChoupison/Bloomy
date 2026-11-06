import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";

/**
 * Au démarrage du serveur : le processus Node prend le fuseau de l'établissement (voir lib/time-zone.ts).
 * Node relit TZ dès qu'on l'affecte ; register() s'exécute avant la première requête.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") process.env.TZ = SCHOOL_TIME_ZONE;
}
