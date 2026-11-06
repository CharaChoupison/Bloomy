// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: graduation-cap;

/* global ListWidget, Color, Font, Request, Keychain, Pasteboard, Alert, FileManager, Script, config */

// Widget Pronoti pour l'app Scriptable (iPhone).
// - Copié depuis Pronoti › Réglages › Widget : l'adresse du serveur ci-dessous y est remplie automatiquement.
// - Le code d'accès n'est jamais écrit dans ce script : il est rangé dans le trousseau iOS (Keychain).
// - Lance le script une fois dans Scriptable pour coller ton code, puis ajoute le widget sur l'écran d'accueil.
// Données lues : GET /api/widget (contrat dans src/lib/widget/data.ts, version 1).

const SERVER = "__PRONOTI_URL__";
const KEYCHAIN_KEY = "pronoti-widget-code";
const CACHE_FILE = "pronoti-widget.json";
const API_VERSION = 1;

// ─── Design tokens (repris de src/app/globals.css : clair / sombre) ────────────────────────────
const dyn = (light, dark) => Color.dynamic(new Color(light), new Color(dark));
const ACCENTS = {
  bleu: ["#2156d9", "#86aefc"],
  violet: ["#6d3fd6", "#b9a2fb"],
  framboise: ["#b8205f", "#f58fbc"],
  ocean: ["#0b6f8c", "#5cc8e6"],
  sapin: ["#0f766e", "#4fd1be"],
  graphite: ["#3f3f46", "#d4d4d8"],
};
const C = {
  surface: dyn("#ffffff", "#17171a"),
  ink: dyn("#1c1c1e", "#f2f2f4"),
  muted: dyn("#6b6b73", "#9a9aa3"),
  warn: dyn("#8a4b00", "#f5c46b"),
  danger: dyn("#b4380a", "#ffa071"),
  test: dyn("#5b2dbf", "#c9b6ff"),
  accent: dyn(...ACCENTS.bleu),
};
const F = {
  label: Font.semiboldSystemFont(12),
  hero: Font.boldRoundedSystemFont(30),
  heroSmall: Font.boldRoundedSystemFont(22),
  title: Font.semiboldSystemFont(15),
  body: Font.systemFont(13),
  bodyStrong: Font.semiboldSystemFont(13),
  caption: Font.systemFont(12),
};
const SPACE = { xs: 2, sm: 4, md: 8, lg: 12, pad: 14 };

// ─── Dates ─────────────────────────────────────────────────────────────────────────────────────
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const shortDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const time = (iso) => timeFmt.format(new Date(iso));
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** "Demain", "Lundi"… pour un cours qui n'est pas aujourd'hui. */
function dayName(date, now) {
  if (sameDay(date, addDays(now, 1))) return "Demain";
  return capitalize(weekdayFmt.format(date));
}

/** Échéance d'un devoir ("YYYY-MM-DD") : "Aujourd'hui", "Demain", "jeu. 12". */
function dueLabel(key, now) {
  const [y, m, d] = key.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  if (sameDay(due, now)) return "Aujourd'hui";
  if (sameDay(due, addDays(now, 1))) return "Demain";
  return shortDayFmt.format(due);
}

// ─── Données ───────────────────────────────────────────────────────────────────────────────────
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);

function readCache() {
  try {
    return fm.fileExists(cachePath) ? JSON.parse(fm.readString(cachePath)) : null;
  } catch {
    return null;
  }
}

/**
 * { data } si tout va bien ; { data, stale: true } avec les dernières données connues si le réseau manque ;
 * { error } si le serveur refuse (code désactivé, session expirée…).
 */
async function load(code) {
  const req = new Request(`${SERVER}/api/widget`);
  req.headers = { Authorization: `Bearer ${code}`, Accept: "application/json" };
  req.timeoutInterval = 15;
  let body;
  try {
    body = JSON.parse(await req.loadString());
  } catch {
    const cached = readCache();
    return cached ? { data: cached, stale: true } : { error: "Pronoti injoignable. Vérifie ta connexion." };
  }
  const status = req.response?.statusCode ?? 0;
  if (status !== 200) {
    // Panne passagère de Pronote : on garde l'affichage précédent plutôt qu'un message d'erreur.
    const cached = status >= 500 ? readCache() : null;
    return cached ? { data: cached, stale: true } : { error: body?.error || `Erreur ${status}` };
  }
  if (body.v !== API_VERSION) return { error: "Mets à jour le script depuis Pronoti › Réglages › Widget." };
  fm.writeString(cachePath, JSON.stringify(body));
  return { data: body };
}

/** Cours à mettre en avant : le cours en cours, sinon le prochain non annulé. */
function nextClass(classes, now) {
  return (classes || []).find((c) => !c.canceled && new Date(c.end) > now) || null;
}

// ─── Briques d'affichage ───────────────────────────────────────────────────────────────────────
function text(stack, value, font, color, lines = 1) {
  const t = stack.addText(value);
  t.font = font;
  t.textColor = color;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.8;
  return t;
}

/** Bloc « prochain cours » : libellé, heure en grand, matière, salle et statut. */
function classBlock(stack, cls, now, { compact = false } = {}) {
  if (!cls) {
    text(stack, "Emploi du temps", F.label, C.accent);
    stack.addSpacer(SPACE.sm);
    text(stack, "Pas de cours dans les 7 prochains jours", F.title, C.ink, 3);
    return;
  }
  const start = new Date(cls.start);
  const ongoing = start <= now;
  const today = sameDay(start, now);
  const label = ongoing ? "En cours · fin à" : today ? "Prochain cours" : dayName(start, now);

  text(stack, label, F.label, today ? C.accent : C.muted);
  stack.addSpacer(SPACE.xs);
  text(stack, time(ongoing ? cls.end : cls.start), compact ? F.heroSmall : F.hero, C.ink);
  stack.addSpacer(SPACE.xs);
  text(stack, cls.title, F.title, C.ink, compact ? 1 : 2);
  const details = [cls.room, cls.test ? "Contrôle" : null].filter(Boolean).join(" · ");
  if (details) text(stack, details, F.body, cls.test ? C.test : C.muted);
  // Statut Pronote (« Prof. absent », « Changement de salle »…) : en texte, pas seulement en couleur.
  if (cls.status) text(stack, cls.status, F.bodyStrong, C.warn);
}

function assignmentsBlock(stack, assignments, now, max) {
  text(stack, "À faire", F.label, C.muted);
  stack.addSpacer(SPACE.sm);
  if (!assignments) return text(stack, "Devoirs indisponibles", F.body, C.muted, 2);
  if (assignments.remaining === 0) return text(stack, "Rien à faire, profites-en", F.body, C.ink, 2);

  for (const a of assignments.items.slice(0, max)) {
    const row = stack.addStack();
    row.layoutHorizontally();
    text(row, a.subject, F.bodyStrong, C.ink);
    row.addSpacer();
    row.addSpacer(SPACE.sm);
    text(row, dueLabel(a.due, now), F.caption, C.muted);
    stack.addSpacer(SPACE.xs);
  }
  const more = assignments.remaining - Math.min(max, assignments.items.length);
  if (more > 0) text(stack, `+ ${more} autre${more > 1 ? "s" : ""}`, F.caption, C.muted);
}

function laterClassesBlock(stack, classes, highlighted, now, max) {
  const later = (classes || []).filter((c) => c !== highlighted && new Date(c.start) > now).slice(0, max);
  if (!later.length) return;
  text(stack, "Ensuite", F.label, C.muted);
  stack.addSpacer(SPACE.sm);
  for (const c of later) {
    const row = stack.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const start = new Date(c.start);
    const when = sameDay(start, now) ? time(c.start) : `${shortDayFmt.format(start)} ${time(c.start)}`;
    text(row, when, F.bodyStrong, C.ink);
    row.addSpacer(SPACE.md);
    text(row, c.title, F.body, c.canceled ? C.muted : C.ink);
    row.addSpacer();
    if (c.canceled) text(row, "Annulé", F.caption, C.danger);
    else if (c.room) text(row, c.room, F.caption, C.muted);
    stack.addSpacer(SPACE.xs);
  }
}

function gradeBlock(stack, grades) {
  if (!grades || !grades.length) return;
  const g = grades[0];
  text(stack, "Dernière note", F.label, C.muted);
  stack.addSpacer(SPACE.sm);
  const row = stack.addStack();
  row.layoutHorizontally();
  text(row, g.subject, F.bodyStrong, C.ink);
  row.addSpacer();
  text(row, g.outOf ? `${g.value} / ${g.outOf}` : g.value, F.bodyStrong, C.accent);
}

function footer(stack, result) {
  if (!result.stale) return;
  stack.addSpacer(SPACE.sm);
  text(stack, `Hors ligne · données de ${time(result.data.generatedAt)}`, F.caption, C.muted);
}

// ─── Widgets par taille ────────────────────────────────────────────────────────────────────────
function baseWidget() {
  const w = new ListWidget();
  w.backgroundColor = C.surface;
  w.setPadding(SPACE.pad, SPACE.pad, SPACE.pad, SPACE.pad);
  w.url = SERVER;
  return w;
}

function errorWidget(message) {
  const w = baseWidget();
  text(w, "Pronoti", F.label, C.accent);
  w.addSpacer(SPACE.sm);
  text(w, message, F.body, C.ink, 5);
  w.addSpacer();
  text(w, config.runsInWidget ? "Ouvre le script dans Scriptable" : "", F.caption, C.muted);
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return w;
}

function accessoryWidget(family, data, now) {
  const w = new ListWidget();
  const cls = nextClass(data.classes, now);
  const todo = data.assignments ? data.assignments.remaining : null;
  // Cours en cours : on donne l'heure de fin ; sinon l'heure de début.
  const when = !cls ? "" : new Date(cls.start) <= now ? `Fin ${time(cls.end)}` : time(cls.start);
  if (family === "accessoryCircular") {
    w.addSpacer();
    const n = w.addText(todo === null ? "–" : String(todo));
    n.font = Font.boldRoundedSystemFont(22);
    n.centerAlignText();
    const l = w.addText("devoirs");
    l.font = Font.systemFont(10);
    l.centerAlignText();
    w.addSpacer();
    return w;
  }
  if (family === "accessoryInline") {
    w.addText(cls ? `${when} ${cls.title}${cls.room ? ` · ${cls.room}` : ""}` : "Pas de cours");
    return w;
  }
  // accessoryRectangular
  if (cls) {
    const head = w.addText(`${when}${cls.room ? ` · ${cls.room}` : ""}`);
    head.font = Font.boldSystemFont(15);
    const t = w.addText(cls.title);
    t.font = Font.systemFont(13);
    t.lineLimit = 1;
  } else {
    w.addText("Pas de cours").font = Font.boldSystemFont(15);
  }
  if (todo !== null) w.addText(`${todo} devoir${todo > 1 ? "s" : ""} à faire`).font = Font.systemFont(12);
  return w;
}

function homeWidget(family, result, now) {
  const data = result.data;
  const cls = data.classes === null ? undefined : nextClass(data.classes, now);
  const w = baseWidget();

  const showClass = (stack, opts) =>
    cls === undefined ? text(stack, "Emploi du temps indisponible", F.title, C.ink, 3) : classBlock(stack, cls, now, opts);

  if (family === "small") {
    showClass(w);
    w.addSpacer();
    const todo = data.assignments?.remaining;
    if (todo !== undefined) {
      text(w, todo ? `${todo} devoir${todo > 1 ? "s" : ""} à faire` : "Aucun devoir", F.caption, C.muted);
    }
    footer(w, result);
  } else if (family === "medium") {
    const row = w.addStack();
    row.layoutHorizontally();
    const left = row.addStack();
    left.layoutVertically();
    left.url = `${SERVER}/semaine`;
    showClass(left, { compact: true });
    left.addSpacer();
    row.addSpacer(SPACE.lg);
    const right = row.addStack();
    right.layoutVertically();
    right.url = `${SERVER}/devoirs`;
    assignmentsBlock(right, data.assignments, now, 3);
    right.addSpacer();
    footer(w, result);
  } else {
    // large / extraLarge
    const top = w.addStack();
    top.layoutVertically();
    top.url = `${SERVER}/semaine`;
    showClass(top);
    w.addSpacer(SPACE.lg);
    laterClassesBlock(w, data.classes, cls, now, 3);
    w.addSpacer(SPACE.lg);
    const todo = w.addStack();
    todo.layoutVertically();
    todo.url = `${SERVER}/devoirs`;
    assignmentsBlock(todo, data.assignments, now, 3);
    w.addSpacer(SPACE.lg);
    gradeBlock(w, data.grades);
    w.addSpacer();
    footer(w, result);
  }

  // Prochain rafraîchissement : au début ou à la fin du cours affiché, sinon dans 30 min.
  const soon = Date.now() + 30 * 60 * 1000;
  const change = cls ? (new Date(cls.start) > now ? Date.parse(cls.start) : Date.parse(cls.end)) : soon;
  w.refreshAfterDate = new Date(Math.max(Date.now() + 5 * 60 * 1000, Math.min(soon, change)));
  return w;
}

async function buildWidget(family) {
  const code = Keychain.contains(KEYCHAIN_KEY) ? Keychain.get(KEYCHAIN_KEY) : null;
  if (!code) return errorWidget("Lance ce script dans Scriptable pour coller ton code d'accès Pronoti.");
  const result = await load(code);
  if (result.error) return errorWidget(result.error);

  const [light, dark] = ACCENTS[result.data.accent] || ACCENTS.bleu;
  C.accent = dyn(light, dark);
  const now = new Date();
  return family.startsWith("accessory") ? accessoryWidget(family, result.data, now) : homeWidget(family, result, now);
}

// ─── Réglage dans l'app Scriptable ─────────────────────────────────────────────────────────────
const CODE_FORMAT = /^pw1\.[0-9a-f]{64}\.[A-Za-z0-9_-]{43}$/;

async function info(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("OK");
  await a.presentAlert();
}

async function askCode() {
  const pasted = (Pasteboard.paste() || "").trim();
  const a = new Alert();
  a.title = "Code d'accès Pronoti";
  a.message = "Crée-le dans Pronoti › Réglages › Widget, copie-le, puis colle-le ici.";
  a.addTextField("pw1.…", CODE_FORMAT.test(pasted) ? pasted : "");
  a.addAction("Enregistrer");
  a.addCancelAction("Annuler");
  if ((await a.presentAlert()) === -1) return false;

  const code = a.textFieldValue(0).trim();
  if (!CODE_FORMAT.test(code)) {
    await info("Code incomplet", "Copie le code en entier depuis Pronoti, puis réessaie.");
    return false;
  }
  const result = await load(code);
  if (result.error) {
    await info("Code refusé", result.error);
    return false;
  }
  Keychain.set(KEYCHAIN_KEY, code);
  await info("C'est prêt", "Ajoute le widget : appui long sur l'écran d'accueil › + › Scriptable, puis choisis ce script.");
  return true;
}

async function settings() {
  if (!Keychain.contains(KEYCHAIN_KEY) && !(await askCode())) return;
  const a = new Alert();
  a.title = "Widget Pronoti";
  a.addAction("Aperçu petit");
  a.addAction("Aperçu moyen");
  a.addAction("Aperçu grand");
  a.addAction("Changer de code d'accès");
  a.addDestructiveAction("Oublier le code");
  a.addCancelAction("Fermer");
  const choice = await a.presentSheet();
  if (choice >= 0 && choice <= 2) {
    const family = ["small", "medium", "large"][choice];
    const w = await buildWidget(family);
    await [() => w.presentSmall(), () => w.presentMedium(), () => w.presentLarge()][choice]();
  } else if (choice === 3) {
    await askCode();
  } else if (choice === 4) {
    Keychain.remove(KEYCHAIN_KEY);
    if (fm.fileExists(cachePath)) fm.remove(cachePath);
  }
}

if (config.runsInWidget) {
  Script.setWidget(await buildWidget(config.widgetFamily || "small"));
} else {
  await settings();
}
Script.complete();
