import { test } from "node:test";
import assert from "node:assert/strict";
import { planBestTurn, planFight, simulateRace, type TargetProfile } from "../src/engine/optimizer.js";
import type { AttackerProfile } from "../src/engine/damage.js";
import type { DamageSpellOption } from "../src/lib/spellCatalog.js";

const caster: AttackerProfile = {
  characteristics: { strength: 0, intelligence: 0, chance: 500, agility: 0 },
  elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
  combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 },
};

const target: TargetProfile = { resistancePercent: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 } };

function spell(overrides: Partial<DamageSpellOption>): DamageSpellOption {
  return {
    spellId: 1,
    name: "Sort test",
    grade: 1,
    apCost: 3,
    maxCastPerTurn: 0,
    maxCastPerTarget: 0,
    range: 6,
    element: "water",
    normalDamage: { min: 100, max: 100 },
    criticalDamage: { min: 100, max: 100 },
    criticalHitProbability: 100000, // ~0% crit, résultats déterministes
    ...overrides,
  };
}

test("planBestTurn respecte maxCastPerTurn", () => {
  const s = spell({ apCost: 1, maxCastPerTurn: 2 });
  const turn = planBestTurn([s], caster, target, 10);
  const casts = turn.entries.find((e) => e.spellId === s.spellId)?.casts ?? 0;
  assert.equal(casts, 2);
});

test("planBestTurn choisit la meilleure combinaison sous contrainte de PA", () => {
  const cheap = spell({ spellId: 1, apCost: 2, normalDamage: { min: 50, max: 50 }, criticalDamage: { min: 50, max: 50 } });
  const expensive = spell({ spellId: 2, apCost: 4, normalDamage: { min: 150, max: 150 }, criticalDamage: { min: 150, max: 150 } });
  const turn = planBestTurn([cheap, expensive], caster, target, 4);
  // 2x cheap (2x550=1100, PA=4) doit battre 1x expensive (1x650=650, PA=4)
  // (550 = 50 dé + 500 chance et 650 = 150 + 500)
  assert.equal(turn.totalDamage, 1100);
});

test("planFight respecte maxCastPerTarget sur tout le combat, pas juste un tour", () => {
  const limited = spell({ spellId: 1, apCost: 1, maxCastPerTarget: 1, normalDamage: { min: 10, max: 10 }, criticalDamage: { min: 10, max: 10 } });
  const filler = spell({ spellId: 2, apCost: 1, normalDamage: { min: 1, max: 1 }, criticalDamage: { min: 1, max: 1 } });
  // Budget large, PV suffisants pour forcer plusieurs tours.
  const fight = planFight([limited, filler], caster, target, 5, 5000);

  // Reconstitue le nombre total de lancers de `limited` sur tout le combat.
  const remaining = new Map([[limited.spellId, 1]]);
  let totalLimitedCasts = 0;
  let hp = 5000;
  let turns = 0;
  while (hp > 0 && turns < 200) {
    turns++;
    const turn = planBestTurn([limited, filler], caster, target, 5, remaining);
    for (const e of turn.entries) {
      if (e.spellId === limited.spellId) totalLimitedCasts += e.casts;
      remaining.set(e.spellId, (remaining.get(e.spellId) ?? Infinity) - (e.spellId === limited.spellId ? e.casts : 0));
    }
    hp -= turn.totalDamage;
  }
  assert.ok(totalLimitedCasts <= 1, `sort limité lancé ${totalLimitedCasts} fois, attendu <= 1`);
  assert.ok(fight.turnsNeeded > 1, "le combat doit prendre plusieurs tours pour que le test soit pertinent");
});

test("planFight lève une erreur si la cible est impossible à tuer (sorts épuisés)", () => {
  const oneShot = spell({ spellId: 1, apCost: 1, maxCastPerTarget: 1, normalDamage: { min: 10, max: 10 }, criticalDamage: { min: 10, max: 10 } });
  assert.throws(() => planFight([oneShot], caster, target, 5, 1_000_000));
});

test("simulateRace : le camp qui inflige le plus de dégâts gagne", () => {
  const playerSpell = spell({ spellId: 1, apCost: 2, normalDamage: { min: 1000, max: 1000 }, criticalDamage: { min: 1000, max: 1000 } });
  const monsterSpell = spell({ spellId: 2, apCost: 2, normalDamage: { min: 10, max: 10 }, criticalDamage: { min: 10, max: 10 } });
  const monsterCaster: AttackerProfile = {
    characteristics: { strength: 0, intelligence: 0, chance: 0, agility: 0 },
    elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
    combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 },
  };

  const race = simulateRace(
    [playerSpell],
    () => ({ caster, apBudget: 10 }),
    target,
    500, // PV monstre : mort en 1 tour du joueur
    [monsterSpell],
    monsterCaster,
    10,
    target,
    5000, // PV joueur : largement de quoi survivre
  );

  assert.equal(race.outcome, "player_wins");
  assert.equal(race.turnsToKillMonster, 1);
  assert.equal(race.turnsToKillPlayer, null);
});
