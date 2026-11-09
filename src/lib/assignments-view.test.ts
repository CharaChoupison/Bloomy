import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { organizeAssignments, parseFilter } from "./assignments-view";

const today = "2026-11-09";
const items = [
  { id: "late", deadlineKey: "2026-11-05", done: false },
  { id: "late-done", deadlineKey: "2026-11-06", done: true },
  { id: "today", deadlineKey: "2026-11-09", done: false },
  { id: "tomorrow-done", deadlineKey: "2026-11-10", done: true },
  { id: "tomorrow", deadlineKey: "2026-11-10", done: false },
];

describe("organizeAssignments", () => {
  it("sépare les devoirs en retard et cache les devoirs passés déjà faits", () => {
    const r = organizeAssignments(items, today, "all");
    assert.deepEqual(r.overdue.map((a) => a.id), ["late"]);
    assert.deepEqual(r.upcoming.map(([k, l]) => [k, l.map((a) => a.id)]), [
      ["2026-11-09", ["today"]],
      ["2026-11-10", ["tomorrow-done", "tomorrow"]],
    ]);
    assert.equal(r.left, 3);
  });

  it("« À faire » cache les devoirs faits, sauf ceux cochés pendant la visite", () => {
    const todo = organizeAssignments(items, today, "todo");
    assert.deepEqual(todo.upcoming.map(([, l]) => l.map((a) => a.id)), [["today"], ["tomorrow"]]);

    const kept = organizeAssignments(items, today, "todo", new Set(["tomorrow-done", "late-done"]));
    assert.deepEqual(kept.overdue.map((a) => a.id), ["late", "late-done"]);
    assert.deepEqual(kept.upcoming[1][1].map((a) => a.id), ["tomorrow-done", "tomorrow"]);
  });
});

describe("parseFilter", () => {
  it("« tout » ou « À faire » par défaut", () => {
    assert.equal(parseFilter("tout"), "all");
    assert.equal(parseFilter(undefined), "todo");
    assert.equal(parseFilter(["tout"]), "todo");
  });
});
