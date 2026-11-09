import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, deadlineLabel, formatWeekRange } from "./format";
import { calmShouting } from "./text-case";

describe("dates", () => {
  it("addDays traverse les mois et les changements d'heure", () => {
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
    assert.equal(addDays("2026-10-24", 7), "2026-10-31");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });

  it("deadlineLabel", () => {
    assert.equal(deadlineLabel("2026-11-09", "2026-11-09"), "Pour aujourd'hui");
    assert.equal(deadlineLabel("2026-11-10", "2026-11-09"), "Pour demain");
    assert.equal(deadlineLabel("2026-11-13", "2026-11-09"), "Pour vendredi 13 novembre");
  });

  it("formatWeekRange", () => {
    assert.equal(formatWeekRange("2026-11-09"), "9 – 15 novembre");
    assert.equal(formatWeekRange("2026-11-30"), "30 novembre – 6 décembre");
  });
});

describe("calmShouting", () => {
  it("remet en casse de phrase en gardant les sigles", () => {
    assert.equal(calmShouting("CALENDRIER DST - MASTERS"), "Calendrier DST - masters");
    assert.equal(calmShouting("Déjà en minuscules"), "Déjà en minuscules");
  });
});
