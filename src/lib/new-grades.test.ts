import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countNewGrades, isNewGrade, mergeSeen, NEW_FOR_MS, parseIds, parseStamps } from "./new-grades";

const now = Date.parse("2026-11-09T12:00:00Z");
const old = { id: "a", date: new Date(now - NEW_FOR_MS - 1000).toISOString() };
const fresh = { id: "b", date: new Date(now - 1000).toISOString() };

describe("isNewGrade", () => {
  it("sans historique, se fie à la date (une semaine)", () => {
    assert.equal(isNewGrade(old, null, now), false);
    assert.equal(isNewGrade(fresh, null, now), true);
  });

  it("avec historique, ignore la date : une vieille note jamais vue est nouvelle", () => {
    assert.equal(isNewGrade(old, new Set(), now), true);
    assert.equal(isNewGrade(fresh, new Set(["b"]), now), false);
  });

  it("compte les notes nouvelles", () => {
    assert.equal(countNewGrades([old, fresh], new Set(["a"]), now), 1);
  });
});

describe("mergeSeen", () => {
  it("ajoute sans doublon et garde les plus récentes au-delà du plafond", () => {
    assert.deepEqual(mergeSeen(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
    assert.deepEqual(mergeSeen(["a", "b", "c"], ["a", "d"], 3), ["c", "a", "d"]);
    assert.deepEqual(mergeSeen(null, ["x"]), ["x"]);
  });
});

describe("lecture du stockage", () => {
  it("résiste aux valeurs absentes ou corrompues", () => {
    assert.equal(parseIds(null), null);
    assert.equal(parseIds("{"), null);
    assert.deepEqual(parseIds('["a", 3, "b"]'), ["a", "b"]);
    assert.deepEqual(parseStamps('[{"id":"a","date":"x"},{"id":1}]'), [{ id: "a", date: "x" }]);
    assert.deepEqual(parseStamps("oops"), []);
  });
});
