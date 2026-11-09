import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stableGradeIds, type GradeIdentity } from "./grade-key";

const grade: GradeIdentity = {
  date: "2026-11-05T23:00:00.000Z",
  subject: "ANGLAIS",
  comment: "Oral",
  outOf: { kind: 0, points: 20 },
  coefficient: 1,
  isBonus: false,
  isOptional: false,
};

describe("stableGradeIds", () => {
  it("donne le même identifiant à la même note, d'une session à l'autre", () => {
    assert.deepEqual(stableGradeIds([grade]), stableGradeIds([{ ...grade, subject: " anglais " }]));
  });

  it("distingue des notes différentes", () => {
    const [a, b, c] = stableGradeIds([grade, { ...grade, comment: "Écrit" }, { ...grade, coefficient: 2 }]);
    assert.equal(new Set([a, b, c]).size, 3);
  });

  it("départage deux notes identiques par leur rang", () => {
    const [a, b] = stableGradeIds([grade, grade]);
    assert.notEqual(a, b);
    assert.equal(b, `${a}-1`);
  });
});
