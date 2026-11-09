import { SCHOOL_TIME_ZONE } from "@/lib/time-zone";

/**
 * Au démarrage du serveur : le processus Node prend le fuseau de l'établissement (voir lib/time-zone.ts),
 * puis lance la vérification périodique des notifications.
 * Node relit TZ dès qu'on l'affecte ; register() s'exécute avant la première requête.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  process.env.TZ = SCHOOL_TIME_ZONE;
  // Notifications : vérification périodique de Pronote pour les élèves abonnés (voir lib/push).
  const { startTicking } = await import("@/lib/push/tick");
  startTicking();
}
