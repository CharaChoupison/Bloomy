// Ce qui mérite une notification depuis la dernière vérification (fonctions pures).
// On compare des identifiants Pronote à l'instantané précédent : rien d'autre n'est conservé.
import { addDays, deadlineLabel, formatDay, formatTime } from "@/lib/format";
import { calmShouting } from "@/lib/text-case";

export type PushPrefs = {
  grades: boolean;
  assignments: boolean;
  timetable: boolean;
  /** Afficher la valeur des notes dans la notification (visible sur l'écran verrouillé). */
  showValues: boolean;
};

export const DEFAULT_PREFS: PushPrefs = { grades: true, assignments: true, timetable: true, showValues: false };

export function parsePrefs(value: unknown): PushPrefs {
  const v = (value ?? {}) as Partial<Record<keyof PushPrefs, unknown>>;
  const pick = (k: keyof PushPrefs) => (typeof v[k] === "boolean" ? (v[k] as boolean) : DEFAULT_PREFS[k]);
  return { grades: pick("grades"), assignments: pick("assignments"), timetable: pick("timetable"), showValues: pick("showValues") };
}

/**
 * Dernier état connu : identifiants des notes et devoirs, et état de chaque cours à venir.
 * `gradeIds: 2` : identifiants de notes stables (lib/grade-key.ts). Un instantané plus ancien porte
 * les identifiants Pronote, qui ne se comparent pas aux nouveaux.
 */
export type Snapshot = { grades: string[]; assignments: string[]; classes: Record<string, string>; gradeIds?: 2 };

/** Identifiants gardés en mémoire : plus qu'une année de notes ou de devoirs, mais borné. */
const KEEP = 1000;

export type CheckInput = {
  grades: { id: string; subject: string; value?: string }[];
  assignments: { id: string; subject: string; deadlineKey: string; done: boolean }[];
  /** Cours pas encore commencés. */
  classes: {
    id: string;
    title: string;
    start: string;
    dateKey: string;
    /** 0 : cette semaine, 1 : la suivante (pour ouvrir la bonne semaine du Calendrier). */
    weekOffset: number;
    canceled: boolean;
    status?: string;
  }[];
  todayKey: string;
};

export type PushMessage = { title: string; body: string; url: string; tag: string };

/** Au-delà, une seule notification groupée plutôt qu'une rafale. */
const GROUP_FROM = 3;

const name = (subject: string) => calmShouting(subject);
const classState = (c: CheckInput["classes"][number]) => (c.canceled ? "annulé" : (c.status ?? "").trim());

function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "aujourd'hui";
  if (key === addDays(todayKey, 1)) return "demain";
  return formatDay(key).toLowerCase();
}

/**
 * Notifications à envoyer et nouvel instantané. Sans instantané précédent (première vérification),
 * aucune notification : on ne prévient que de ce qui change ensuite.
 */
export function computeChanges(
  prev: Snapshot | null,
  input: CheckInput,
  prefs: PushPrefs,
): { messages: PushMessage[]; snapshot: Snapshot } {
  const comparableGrades = prev?.gradeIds === 2;
  const snapshot: Snapshot = {
    // On garde aussi ce qui est déjà connu : une note ou un devoir qui disparaît un moment (changement
    // de période, fenêtre de dates, réponse partielle de Pronote) puis revient n'est pas « nouveau ».
    grades: [...new Set([...(comparableGrades ? prev.grades : []), ...input.grades.map((g) => g.id)])].slice(-KEEP),
    assignments: [...new Set([...(prev?.assignments ?? []), ...input.assignments.map((a) => a.id)])].slice(-KEEP),
    classes: Object.fromEntries(input.classes.map((c) => [c.id, classState(c)])),
    gradeIds: 2,
  };
  if (!prev) return { messages: [], snapshot };

  const messages: PushMessage[] = [];

  if (prefs.grades && comparableGrades) {
    const known = new Set(prev.grades);
    const fresh = input.grades.filter((g) => !known.has(g.id));
    if (fresh.length >= GROUP_FROM) {
      messages.push({
        title: `${fresh.length} nouvelles notes`,
        body: [...new Set(fresh.map((g) => name(g.subject)))].join(", "),
        url: "/notes",
        tag: "notes",
      });
    } else {
      for (const g of fresh) {
        messages.push({
          title: "Nouvelle note",
          body: prefs.showValues && g.value ? `${name(g.subject)} : ${g.value}` : name(g.subject),
          url: "/notes",
          tag: `note-${g.id}`,
        });
      }
    }
  }

  if (prefs.assignments) {
    const known = new Set(prev.assignments);
    const fresh = input.assignments.filter((a) => !known.has(a.id) && !a.done && a.deadlineKey >= input.todayKey);
    if (fresh.length >= GROUP_FROM) {
      messages.push({
        title: `${fresh.length} nouveaux devoirs`,
        body: [...new Set(fresh.map((a) => name(a.subject)))].join(", "),
        url: "/devoirs",
        tag: "devoirs",
      });
    } else {
      for (const a of fresh) {
        messages.push({
          title: `Nouveau devoir en ${name(a.subject)}`,
          body: deadlineLabel(a.deadlineKey, input.todayKey),
          url: "/devoirs",
          tag: `devoir-${a.id}`,
        });
      }
    }
  }

  if (prefs.timetable) {
    for (const c of input.classes) {
      const before = prev.classes[c.id];
      const now = classState(c);
      // Seulement les changements d'un cours déjà connu, vers un état à signaler.
      if (before === undefined || before === now || now === "") continue;
      const when = `${dayLabel(c.dateKey, input.todayKey)} à ${formatTime(c.start)}`;
      messages.push({
        title: c.canceled ? `Cours annulé : ${name(c.title)}` : `${name(c.title)} : ${now}`,
        body: c.canceled ? `Prévu ${when}.` : `Cours ${when}.`,
        url: c.weekOffset > 0 ? `/semaine?semaine=${c.weekOffset}` : "/semaine",
        tag: `cours-${c.id}`,
      });
    }
  }

  return { messages, snapshot };
}
