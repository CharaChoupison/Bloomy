import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stableAssignmentIds } from "./assignment-key";

describe("stableAssignmentIds", () => {
  it("même devoir, même identifiant, quelle que soit la session", () => {
    const a = stableAssignmentIds([{ subject: "MANAGEMENT", deadlineKey: "2026-11-26" }]);
    const b = stableAssignmentIds([{ subject: " Management ", deadlineKey: "2026-11-26" }]);
    assert.deepEqual(a, b);
  });

  it("matière ou échéance différente : identifiant différent", () => {
    const [a, b, c] = stableAssignmentIds([
      { subject: "MANAGEMENT", deadlineKey: "2026-11-26" },
      { subject: "MANAGEMENT", deadlineKey: "2026-11-27" },
      { subject: "DROIT", deadlineKey: "2026-11-26" },
    ]);
    assert.equal(new Set([a, b, c]).size, 3);
  });

  it("deux devoirs de la même matière pour le même jour sont départagés", () => {
    const ids = stableAssignmentIds([
      { subject: "MANAGEMENT", deadlineKey: "2026-11-26" },
      { subject: "MANAGEMENT", deadlineKey: "2026-11-26" },
    ]);
    assert.equal(ids[1], `${ids[0]}-1`);
  });
});
