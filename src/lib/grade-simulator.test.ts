import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFrenchNumber, simulate, subjectAverage20, type SimGrade } from "./grade-simulator";

const p = (n: number) => ({ kind: 0, points: n });
const g = (value: number, outOf = 20, coefficient = 1, extra: Partial<SimGrade> = {}): SimGrade => ({
  value: p(value),
  outOf: p(outOf),
  coefficient,
  ...extra,
});

describe("subjectAverage20", () => {
  it("pondère par les coefficients et ramène sur 20", () => {
    assert.equal(subjectAverage20([g(10), g(4, 5, 2)]), (10 + 16 * 2) / 3);
  });

  it("ne compte une facultative que si elle fait monter la moyenne", () => {
    assert.equal(subjectAverage20([g(12), g(8, 20, 1, { isOptional: true })]), 12);
    assert.equal(subjectAverage20([g(12), g(18, 20, 1, { isOptional: true })]), 15);
  });

  it("n'ajoute que les points au-dessus de 10 pour un bonus", () => {
    assert.equal(subjectAverage20([g(12), g(16, 20, 1, { isBonus: true })]), 18);
    assert.equal(subjectAverage20([g(12), g(6, 20, 1, { isBonus: true })]), 12);
  });

  it("ignore les cas particuliers (absent, dispensé) et renvoie undefined sans note", () => {
    assert.equal(subjectAverage20([{ value: { kind: 1, points: 0 }, outOf: p(20), coefficient: 1 }]), undefined);
    assert.equal(subjectAverage20([]), undefined);
  });
});

describe("simulate", () => {
  it("applique l'écart simulé à la moyenne officielle", () => {
    const r = simulate({
      grades: [g(10), g(16)],
      extra: [g(19)],
      official: p(13),
      officialOutOf: p(20),
      overall: p(12),
      subjectCount: 4,
    });
    assert.deepEqual(r.subject, { before: 13, after: 15 });
    assert.deepEqual(r.overall, { before: 12, after: 12.5 });
  });

  it("sans moyenne officielle, recalcule et fait entrer la matière dans la moyenne générale", () => {
    const r = simulate({ grades: [], extra: [g(16)], overall: p(12), subjectCount: 3 });
    assert.deepEqual(r.subject, { before: undefined, after: 16 });
    assert.equal(r.overall.after, 13);
  });

  it("reste entre 0 et le barème", () => {
    const r = simulate({ grades: [g(19)], extra: [g(20, 20, 50)], official: p(19.9), officialOutOf: p(20), subjectCount: 1 });
    assert.ok(r.subject.after! <= 20);
  });
});

describe("parseFrenchNumber", () => {
  it("accepte la virgule et refuse le reste", () => {
    assert.equal(parseFrenchNumber("12,5"), 12.5);
    assert.equal(parseFrenchNumber(" 14 "), 14);
    assert.equal(parseFrenchNumber("-3"), undefined);
    assert.equal(parseFrenchNumber("abc"), undefined);
    assert.equal(parseFrenchNumber(""), undefined);
  });
});
