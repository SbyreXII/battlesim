import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSpellDamage, type AttackerProfile } from "../src/engine/damage.js";

function attacker(overrides: Partial<AttackerProfile> = {}): AttackerProfile {
  return {
    characteristics: { strength: 0, intelligence: 0, chance: 0, agility: 0 },
    elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
    combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 },
    ...overrides,
  };
}

test("caractéristique élémentaire s'ajoute au bon élément", () => {
  const caster = attacker({ characteristics: { strength: 0, intelligence: 500, chance: 0, agility: 0 } });
  const result = computeSpellDamage({
    element: "fire",
    normalDamage: { min: 10, max: 10 },
    criticalDamage: { min: 10, max: 10 },
    critChancePercent: 0,
    caster,
    targetResistancePercent: 0,
  });
  assert.equal(result.averageNormalHit, 510); // 10 (dé) + 500 (Intelligence)
});

test("le Neutre ne bénéficie d'aucune caractéristique", () => {
  const caster = attacker({ characteristics: { strength: 999, intelligence: 999, chance: 999, agility: 999 } });
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 10, max: 10 },
    criticalDamage: { min: 10, max: 10 },
    critChancePercent: 0,
    caster,
    targetResistancePercent: 0,
  });
  assert.equal(result.averageNormalHit, 10);
});

test("résistance % puis fixe, dans cet ordre", () => {
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 100, max: 100 },
    criticalDamage: { min: 100, max: 100 },
    critChancePercent: 0,
    caster: attacker(),
    targetResistancePercent: 50, // 100 -> 50
    targetResistanceFixed: 20, // 50 -> 30
  });
  assert.equal(result.averageNormalHit, 30);
});

test("résistance négative (faiblesse) augmente les dégâts", () => {
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 100, max: 100 },
    criticalDamage: { min: 100, max: 100 },
    critChancePercent: 0,
    caster: attacker(),
    targetResistancePercent: -10,
  });
  assert.equal(result.averageNormalHit, 110);
});

test("les dégâts ne descendent jamais sous 0", () => {
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 10, max: 10 },
    criticalDamage: { min: 10, max: 10 },
    critChancePercent: 0,
    caster: attacker(),
    targetResistancePercent: 100,
    targetResistanceFixed: 500,
  });
  assert.equal(result.averageNormalHit, 0);
});

test("un dégât fixe DofusDB (max=0, convention 'pas de jet') n'est pas divisé par 2", () => {
  // Cas réel : "Substitution Funèbre" du monstre Gein, diceNum=40, diceSide=0,
  // Intelligence=1200 -> dofensive.com affiche 520 (40 × (1+1200/100)).
  // Avant le fix, une moyenne (min+max)/2 aurait donné 260, moitié moins.
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 520, max: 0 },
    criticalDamage: { min: 520, max: 0 },
    critChancePercent: 0,
    caster: attacker(),
    targetResistancePercent: 0,
  });
  assert.equal(result.averageNormalHit, 520);
});

test("l'espérance pondère normal et critique par la chance de critique", () => {
  const result = computeSpellDamage({
    element: "neutral",
    normalDamage: { min: 100, max: 100 },
    criticalDamage: { min: 200, max: 200 },
    critChancePercent: 25,
    caster: attacker(),
    targetResistancePercent: 0,
  });
  assert.equal(result.averageNormalHit, 100);
  assert.equal(result.averageCriticalHit, 200);
  assert.equal(result.expectedDamage, 100 * 0.75 + 200 * 0.25);
});
