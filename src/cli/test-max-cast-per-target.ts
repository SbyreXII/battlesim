import { planFight, planBestTurn } from "../engine/optimizer.js";
import type { DamageSpellOption } from "../lib/spellCatalog.js";
import type { AttackerProfile } from "../engine/damage.js";
import type { TargetProfile } from "../engine/optimizer.js";

const caster: AttackerProfile = {
  characteristics: { strength: 0, intelligence: 0, chance: 500, agility: 0 },
  elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
  combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 },
};

const target: TargetProfile = {
  resistancePercent: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
};

// Reproduit le cas signalé : "Grift" limité à 1 lancer/cible sur tout le
// combat, "Lancer de Pièces" limité à 6/tour mais seulement 3/cible.
const grift: DamageSpellOption = {
  spellId: 1,
  name: "Grift",
  grade: 1,
  apCost: 3,
  maxCastPerTurn: 0,
  maxCastPerTarget: 1,
  range: 6,
  element: "water",
  normalDamage: { min: 100, max: 100 },
  criticalDamage: { min: 120, max: 120 },
  criticalHitProbability: 100000, // ~0% crit pour un test déterministe
};

const lancerDePieces: DamageSpellOption = {
  spellId: 2,
  name: "Lancer de Pièces",
  grade: 1,
  apCost: 2,
  maxCastPerTurn: 6,
  maxCastPerTarget: 3,
  range: 6,
  element: "water",
  normalDamage: { min: 30, max: 30 },
  criticalDamage: { min: 40, max: 40 },
  criticalHitProbability: 100000,
};

const spells = [grift, lancerDePieces];

// Budget de PA réduit (4/tour) pour forcer plusieurs tours et vérifier que
// l'épuisement des sorts intervient bien EN COURS de combat, pas seulement
// dès le premier tour.
const fight = planFight(spells, caster, target, 4, 1400);

console.log(`Tours nécessaires : ${fight.turnsNeeded}`);
console.log(`Dégâts totaux : ${fight.totalDamageDealt}`);
console.log(`Premier tour :`, fight.turn.entries);

// Vérifie qu'aucun sort n'est lancé plus que sa limite par cible en le
// re-simulant nous-mêmes tour par tour pour compter les casts cumulés.
// (planFight ne renvoie que le premier tour ; on boucle nous-mêmes ici pour
// l'assertion, avec les mêmes primitives que le moteur.)
function countTotalCasts() {
  const remaining = new Map([
    [grift.spellId, 1],
    [lancerDePieces.spellId, 3],
  ]);
  let hp = 1400;
  const totalCasts = new Map<number, number>();
  let turns = 0;
  while (hp > 0 && turns < 100) {
    turns++;
    const turn = planBestTurn(spells, caster, target, 4, remaining);
    if (turn.totalDamage <= 0) break;
    for (const e of turn.entries) {
      remaining.set(e.spellId, (remaining.get(e.spellId) ?? Infinity) - e.casts);
      totalCasts.set(e.spellId, (totalCasts.get(e.spellId) ?? 0) + e.casts);
    }
    hp -= turn.totalDamage;
  }
  return totalCasts;
}

const totals = countTotalCasts();
console.log("Total de lancers cumulés sur tout le combat :", Object.fromEntries(totals));

const griftCasts = totals.get(grift.spellId) ?? 0;
const lancerCasts = totals.get(lancerDePieces.spellId) ?? 0;

console.log(
  griftCasts <= 1
    ? `✓ Grift respecté (${griftCasts} <= 1)`
    : `✗ BUG : Grift lancé ${griftCasts} fois (max 1)`,
);
console.log(
  lancerCasts <= 3
    ? `✓ Lancer de Pièces respecté (${lancerCasts} <= 3)`
    : `✗ BUG : Lancer de Pièces lancé ${lancerCasts} fois (max 3)`,
);
