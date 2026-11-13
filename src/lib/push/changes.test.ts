import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeChanges, DEFAULT_PREFS, parsePrefs, type CheckInput } from "./changes";

const base: CheckInput = {
  todayKey: "2026-11-09",
  grades: [{ id: "g1", subject: "MATHEMATIQUES", value: "14/20" }],
  assignments: [{ id: "a1", subject: "ANGLAIS", deadlineKey: "2026-11-12", done: false }],
  classes: [
    { id: "c1", title: "DROIT", start: "2026-11-10T09:00:00+01:00", dateKey: "2026-11-10", weekOffset: 0, canceled: false },
  ],
};

describe("computeChanges", () => {
  it("première vérification : un instantané, aucune notification", () => {
    const { messages, snapshot } = computeChanges(null, base, DEFAULT_PREFS);
    assert.deepEqual(messages, []);
    assert.deepEqual(snapshot, {
      grades: ["g1"],
      assignments: ["a1"],
      classes: { c1: "" },
      gradeIds: 2,
      assignmentIds: 2,
    });
  });

  it("nouvelle note : matière seule par défaut, valeur si l'élève l'a demandé", () => {
    const prev = computeChanges(null, base, DEFAULT_PREFS).snapshot;
    const next = { ...base, grades: [...base.grades, { id: "g2", subject: "DROIT CIVIL", value: "12/20" }] };
    assert.deepEqual(computeChanges(prev, next, DEFAULT_PREFS).messages, [
      { title: "Nouvelle note", body: "Droit civil", url: "/notes", tag: "note-g2" },
    ]);
    assert.equal(computeChanges(prev, next, { ...DEFAULT_PREFS, showValues: true }).messages[0].body, "Droit civil : 12/20");
    assert.deepEqual(computeChanges(prev, next, { ...DEFAULT_PREFS, grades: false }).messages, []);
  });

  it("regroupe à partir de trois nouveautés", () => {
    const prev = computeChanges(null, base, DEFAULT_PREFS).snapshot;
    const grades = ["g2", "g3", "g4"].map((id) => ({ id, subject: "ECONOMIE" }));
    const { messages } = computeChanges(prev, { ...base, grades: [...base.grades, ...grades] }, DEFAULT_PREFS);
    assert.deepEqual(messages, [{ title: "3 nouvelles notes", body: "Economie", url: "/notes", tag: "notes" }]);
  });

  it("nouveau devoir à venir, pas un devoir déjà connu ni déjà fait", () => {
    const prev = computeChanges(null, base, DEFAULT_PREFS).snapshot;
    const next = {
      ...base,
      assignments: [
        ...base.assignments,
        { id: "a2", subject: "ECONOMIE", deadlineKey: "2026-11-10", done: false },
        { id: "a3", subject: "ECONOMIE", deadlineKey: "2026-11-10", done: true },
      ],
    };
    assert.deepEqual(computeChanges(prev, next, DEFAULT_PREFS).messages, [
      { title: "Nouveau devoir en Economie", body: "Pour demain", url: "/devoirs", tag: "devoir-a2" },
    ]);
  });

  it("une note qui disparaît puis revient n'est pas renotifiée", () => {
    const prev = computeChanges(null, base, DEFAULT_PREFS).snapshot;
    const gone = computeChanges(prev, { ...base, grades: [] }, DEFAULT_PREFS);
    assert.deepEqual(gone.messages, []);
    assert.deepEqual(computeChanges(gone.snapshot, base, DEFAULT_PREFS).messages, []);
  });

  it("ancien instantané (identifiants Pronote) : pas de rafale, juste une remise à niveau", () => {
    const old = { grades: ["123#xyz"], assignments: ["a1"], classes: { c1: "" } };
    const { messages, snapshot } = computeChanges(old, base, DEFAULT_PREFS);
    assert.deepEqual(messages, []);
    assert.deepEqual(snapshot.grades, ["g1"]);
    assert.equal(snapshot.gradeIds, 2);
  });

  it("ancien instantané de devoirs (identifiants Pronote) : remis à niveau sans notification", () => {
    const old = { grades: ["g1"], assignments: ["456#abc"], classes: { c1: "" }, gradeIds: 2 as const };
    const { messages, snapshot } = computeChanges(old, base, DEFAULT_PREFS);
    assert.deepEqual(messages, []);
    assert.deepEqual(snapshot.assignments, ["a1"]);
    assert.equal(snapshot.assignmentIds, 2);
    // Ensuite, le même devoir n'est plus jamais signalé.
    assert.deepEqual(computeChanges(snapshot, base, DEFAULT_PREFS).messages, []);
  });

  it("cours annulé ou modifié, seulement s'il était déjà connu", () => {
    const prev = computeChanges(null, base, DEFAULT_PREFS).snapshot;
    const canceled = { ...base, classes: [{ ...base.classes[0], canceled: true }] };
    assert.deepEqual(computeChanges(prev, canceled, DEFAULT_PREFS).messages, [
      { title: "Cours annulé : Droit", body: "Prévu demain à 09:00.", url: "/semaine", tag: "cours-c1" },
    ]);

    const fresh = { ...base, classes: [{ ...base.classes[0], id: "c2", canceled: true }] };
    assert.deepEqual(computeChanges(prev, fresh, DEFAULT_PREFS).messages, []);

    const moved = { ...base, classes: [{ ...base.classes[0], status: "Prof. absent", weekOffset: 1 }] };
    assert.deepEqual(computeChanges(prev, moved, DEFAULT_PREFS).messages[0].url, "/semaine?semaine=1");
  });
});

describe("parsePrefs", () => {
  it("garde les valeurs par défaut pour ce qui manque ou est invalide", () => {
    assert.deepEqual(parsePrefs({ grades: false, showValues: "oui" }), { ...DEFAULT_PREFS, grades: false });
    assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
  });
});
