import { test } from "node:test";
import assert from "node:assert/strict";
import { assessKiteFeasibility, splitMonsterSpellsByRange } from "../src/lib/kiteAnalysis.js";
import type { DamageSpellOption } from "../src/lib/spellCatalog.js";

function spell(range: number): DamageSpellOption {
  return {
    spellId: 1,
    name: "Sort test",
    grade: 1,
    apCost: 3,
    maxCastPerTurn: 0,
    maxCastPerTarget: 0,
    range,
    element: "neutral",
    normalDamage: { min: 10, max: 10 },
    criticalDamage: { min: 10, max: 10 },
    criticalHitProbability: 100000,
  };
}

test("pas de kite possible sans sort à distance", () => {
  const result = assessKiteFeasibility([spell(1)], 5, 3);
  assert.equal(result.possible, false);
});

test("pas de kite possible si PM insuffisants face au monstre", () => {
  const result = assessKiteFeasibility([spell(4)], 2, 5);
  assert.equal(result.possible, false);
});

test("kite possible avec un sort à distance et assez de PM", () => {
  const result = assessKiteFeasibility([spell(4)], 5, 3);
  assert.equal(result.possible, true);
});

test("splitMonsterSpellsByRange sépare mêlée et distance", () => {
  const { melee, ranged } = splitMonsterSpellsByRange([spell(1), spell(0), spell(3), spell(6)]);
  assert.equal(melee.length, 2);
  assert.equal(ranged.length, 2);
});
