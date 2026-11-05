// Étape 1b : se connecter avec Pawnote et afficher l'emploi du temps de la semaine.
//
// 1re exécution : connexion par identifiant + mot de passe (lus dans .env.local).
// Pawnote renvoie alors un "token" qu'on enregistre dans .pronote-token.json (gitignoré).
// Exécutions suivantes : on se reconnecte avec ce token, le mot de passe n'est plus utilisé.
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  AccountKind,
  createSessionHandle,
  loginCredentials,
  loginToken,
  parseTimetable,
  timetableFromIntervals,
  type RefreshInformation,
  type SessionHandle,
} from "pawnote";
import { pronoteFetcher } from "./pronote-fetcher.ts";

const TOKEN_FILE = new URL(".pronote-token.json", import.meta.url);

type SavedToken = {
  url: string;
  username: string;
  token: string;
  deviceUUID: string;
  navigatorIdentifier: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante dans .env.local`);
  return value;
}

async function readSavedToken(): Promise<SavedToken | null> {
  try {
    return JSON.parse(await readFile(TOKEN_FILE, "utf8")) as SavedToken;
  } catch {
    return null;
  }
}

// Le token change à chaque connexion : il faut toujours sauvegarder le dernier reçu.
async function saveToken(refresh: RefreshInformation, deviceUUID: string): Promise<void> {
  const saved: SavedToken = {
    url: refresh.url,
    username: refresh.username,
    token: refresh.token,
    deviceUUID,
    navigatorIdentifier: refresh.navigatorIdentifier,
  };
  await writeFile(TOKEN_FILE, JSON.stringify(saved, null, 2), { mode: 0o600 });
}

async function login(session: SessionHandle): Promise<void> {
  const saved = await readSavedToken();

  if (saved) {
    try {
      const refresh = await loginToken(session, {
        url: saved.url,
        kind: AccountKind.STUDENT,
        username: saved.username,
        token: saved.token,
        deviceUUID: saved.deviceUUID,
        navigatorIdentifier: saved.navigatorIdentifier,
      });
      await saveToken(refresh, saved.deviceUUID);
      console.log("🔑 Connectée avec le token enregistré");
      return;
    } catch (error) {
      console.warn("⚠️ Token refusé, retour au mot de passe :", (error as Error).message);
    }
  }

  // Le deviceUUID identifie "cet appareil" auprès de Pronote ; le token n'est valable que pour lui.
  const deviceUUID = saved?.deviceUUID ?? randomUUID();
  const refresh = await loginCredentials(session, {
    url: requireEnv("PRONOTE_URL"),
    kind: AccountKind.STUDENT,
    username: requireEnv("PRONOTE_USERNAME"),
    password: requireEnv("PRONOTE_PASSWORD"),
    deviceUUID,
  });
  await saveToken(refresh, deviceUUID);
  console.log("🔑 Connectée avec identifiant + mot de passe (token enregistré pour la suite)");
}

function currentWeek(): { monday: Date; sunday: Date } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // getDay() : 0 = dimanche
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

const time = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const day = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

async function main(): Promise<void> {
  const session = createSessionHandle(pronoteFetcher);
  await login(session);
  console.log(`👋 ${session.user.name}\n`);

  const { monday, sunday } = currentWeek();
  const timetable = await timetableFromIntervals(session, monday, sunday);
  // Applique la logique officielle de Pronote (fusion des cours, cours annulés superposés, etc.)
  parseTimetable(session, timetable, {
    withCanceledClasses: true,
    withPlannedClasses: true,
    withSuperposedCanceledClasses: false,
  });

  const classes = [...timetable.classes].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  if (classes.length === 0) {
    console.log("Aucun cours cette semaine.");
    return;
  }

  let lastDay = "";
  for (const c of classes) {
    const d = day(c.startDate);
    if (d !== lastDay) {
      console.log(`\n📅 ${d}`);
      lastDay = d;
    }
    const slot = `${time(c.startDate)}–${time(c.endDate)}`;

    if (c.is === "lesson") {
      const flags = [c.canceled && "ANNULÉ", c.status, c.test && "📝 contrôle"].filter(Boolean).join(" · ");
      const where = c.classrooms.join(", ");
      const who = c.teacherNames.join(", ");
      console.log(
        `  ${slot}  ${c.subject?.name ?? "?"}${who ? ` — ${who}` : ""}${where ? ` [${where}]` : ""}${flags ? `  (${flags})` : ""}`,
      );
    } else if (c.is === "activity") {
      console.log(`  ${slot}  Activité : ${c.title}`);
    } else {
      console.log(`  ${slot}  Retenue${c.title ? ` : ${c.title}` : ""}`);
    }
  }
}

main().catch((error: Error) => {
  if (error.name === "SecurityError") {
    console.error("❌ Le compte demande une double authentification (code PIN / appareil). Pas géré dans ce test, dis-le-moi.");
  } else if (error.name === "BadCredentialsError") {
    console.error("❌ Identifiant ou mot de passe incorrect.");
  } else {
    console.error("❌ Erreur :", error);
  }
  process.exitCode = 1;
});
