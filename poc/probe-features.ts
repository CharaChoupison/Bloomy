// Sondage : quels onglets Pronote sont activés pour ce compte, et y a-t-il des données dedans ?
// Lecture seule. N'affiche que des compteurs, jamais le contenu.
// Réutilise (et met à jour) le token de l'app web : web/.data/pronote-token.json
import { readFile, writeFile } from "node:fs/promises";
import * as pronote from "pawnote";
import { pronoteFetcher } from "./pronote-fetcher.ts";

const TOKEN_FILE = new URL("../web/.data/pronote-token.json", import.meta.url);
const saved = JSON.parse(await readFile(TOKEN_FILE, "utf8"));

const session = pronote.createSessionHandle(pronoteFetcher);
const refresh = await pronote.loginToken(session, { ...saved, kind: pronote.AccountKind.STUDENT });
await writeFile(TOKEN_FILE, JSON.stringify({ ...saved, token: refresh.token, navigatorIdentifier: refresh.navigatorIdentifier }, null, 2), { mode: 0o600 });

const T = pronote.TabLocation;
const names = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));
const tabs = session.userResource.tabs;
const auth = session.user.authorizations;

console.log("Onglets activés :", [...tabs.keys()].map((t) => names[t] ?? t).join(", "));
console.log("Onglets NON activés :", Object.values(T).filter((t) => !tabs.has(t)).map((t) => names[t]).join(", ") || "aucun");
console.log("Messagerie : lecture", auth.canReadDiscussions, "| écriture", auth.canDiscuss);
console.log("Périodes :", session.instance.periods.map((p) => p.name).join(", "));
console.log("Vacances connues :", session.instance.holidays.length, "\n");

const now = new Date();
const in4w = new Date(now.getTime() + 28 * 864e5);
const ago4w = new Date(now.getTime() - 28 * 864e5);
const period = (t: number) =>
  tabs.get(t as pronote.TabLocation)?.defaultPeriod ?? session.instance.periods.find((p) => p.name === "Semestre 1")!;

async function probe(label: string, tab: number, fn: () => Promise<string>) {
  void tab; // la liste des onglets n'est pas fiable sur Pronote 2022 : on essaie directement
  try {
    console.log(`✅ ${label} : ${await fn()}`);
  } catch (e) {
    console.log(`⚠️ ${label} : erreur ${(e as Error).name} ${(e as Error).message}`);
  }
}

await probe("Notes", T.Grades, async () => {
  const p = period(T.Grades)!;
  const g = await pronote.gradesOverview(session, p);
  return `${g.grades.length} notes, ${g.subjectsAverages.length} moyennes par matière, moyenne générale ${g.overallAverage ? "oui" : "non"} (période ${p.name}, ${tabs.get(T.Grades)!.periods.length} périodes dispo)`;
});
await probe("Compétences / évaluations", T.Evaluations, async () => {
  const e = await pronote.evaluations(session, period(T.Evaluations)!);
  return `${e.length} évaluations`;
});
await probe("Bulletin", T.Gradebook, async () => {
  const b = await pronote.gradebook(session, period(T.Gradebook)!);
  return `disponible (${Object.keys(b).join(", ")})`;
});
await probe("Devoirs (4 prochaines semaines)", T.Assignments, async () => {
  const a = await pronote.assignmentsFromIntervals(session, now, in4w);
  return `${a.length} devoirs`;
});
await probe("Contenu des cours (4 dernières semaines)", T.Resources, async () => {
  const r = await pronote.resourcesFromIntervals(session, ago4w, now);
  return `${r.length} séances avec contenu`;
});
await probe("Vie scolaire (absences, retards…)", T.Notebook, async () => {
  const n = await pronote.notebook(session, period(T.Notebook)!);
  return `${n.absences.length} absences, ${n.delays.length} retards, ${n.punishments.length} punitions, ${n.observations.length} observations`;
});
await probe("Actualités / sondages", T.News, async () => {
  const n = await pronote.news(session);
  return `${n.items.length} actus, ${n.categories.length} catégories`;
});
await probe("Messagerie", T.Discussions, async () => {
  const d = await pronote.discussions(session);
  return `${d.items.length} discussions, ${d.folders.length} dossiers`;
});
await probe("Menus cantine", T.Menus, async () => {
  const m = await pronote.menus(session);
  return `${m.days.length} jours de menu`;
});
await probe("Compte / infos perso", T.Account, async () => {
  const a = await pronote.account(session);
  return `champs : ${Object.keys(a).join(", ")}`;
});
