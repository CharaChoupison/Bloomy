import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ClassItem } from "@/lib/pronote/timetable";
import { formatDuration, mergeConsecutive, withBreaks } from "./timetable-layout";

// 2026-11-09 : heure d'hiver à Paris (UTC+1).
const at = (hhmm: string) => new Date(`2026-11-09T${hhmm}:00+01:00`).toISOString();
const cls = (id: string, start: string, end: string, extra: Partial<ClassItem> = {}): ClassItem => ({
  id,
  kind: "lesson",
  start: at(start),
  end: at(end),
  title: "Audit",
  teachers: ["M. Martin"],
  rooms: ["B12"],
  groups: [],
  canceled: false,
  exempted: false,
  test: false,
  ...extra,
});

describe("mergeConsecutive", () => {
  it("fusionne deux séances identiques à la suite et garde leurs débuts", () => {
    const [merged, ...rest] = mergeConsecutive([cls("1", "10:00", "10:55"), cls("2", "10:55", "12:40")]);
    assert.equal(rest.length, 0);
    assert.equal(merged.id, "1");
    assert.equal(merged.end, at("12:40"));
    assert.deepEqual(merged.sessionStarts, [at("10:00"), at("10:55")]);
  });

  it("ne fusionne pas des cours différents ou trop espacés", () => {
    assert.equal(mergeConsecutive([cls("1", "10:00", "11:00"), cls("2", "11:00", "12:00", { rooms: ["C3"] })]).length, 2);
    assert.equal(mergeConsecutive([cls("1", "10:00", "11:00"), cls("2", "11:30", "12:00")]).length, 2);
  });
});

describe("withBreaks", () => {
  it("insère les pauses et repère une seule pause déjeuner", () => {
    const entries = withBreaks([
      cls("1", "08:00", "10:00"),
      cls("2", "10:15", "12:00", { title: "Droit" }),
      cls("3", "13:30", "15:00", { title: "Maths" }),
    ]);
    const breaks = entries.filter((e) => e.type === "break");
    assert.equal(breaks.length, 2);
    assert.deepEqual(breaks.map((b) => b.type === "break" && [b.lunch, b.duration]), [
      [false, "15 min"],
      [true, "1 h 30"],
    ]);
  });

  it("pas de pause entre deux cours qui se chevauchent", () => {
    const entries = withBreaks([cls("1", "08:00", "12:00"), cls("2", "09:00", "10:00", { title: "TP" }), cls("3", "12:00", "13:00", { title: "X" })]);
    assert.equal(entries.filter((e) => e.type === "break").length, 0);
  });
});

describe("formatDuration", () => {
  it("écrit les durées à la française", () => {
    assert.equal(formatDuration(10 * 60_000), "10 min");
    assert.equal(formatDuration(95 * 60_000), "1 h 35");
    assert.equal(formatDuration(120 * 60_000), "2 h");
  });
});
