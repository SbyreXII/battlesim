import type { DamageSpellOption, BuffSpellOption } from "../lib/spellCatalog.js";
import { computeSpellDamage, type Element, type AttackerProfile } from "./damage.js";

export type ResistanceProfile = Record<Element, number>;

export interface TurnPlanEntry {
  spellId: number;
  name: string;
  casts: number;
  apCostEach: number;
  expectedDamageEach: number;
}

export interface TurnPlan {
  entries: TurnPlanEntry[];
  totalApUsed: number;
  totalDamage: number;
}

export interface TargetProfile {
  resistancePercent: ResistanceProfile;
  resistanceFixed?: ResistanceProfile;
  /** Réduit la chance de critique de l'attaquant (ex: "Résistance Critique" du joueur). */
  critResistancePercent?: number;
}

const ZERO_RESISTANCE: ResistanceProfile = { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 };

/**
 * Cherche la meilleure combinaison de sorts jouable en un tour (knapsack
 * borné : chaque sort peut être lancé plusieurs fois, dans la limite de son
 * `maxCastPerTurn` et du budget de PA). Les dégâts par sort sont pris en
 * espérance (cf. engine/damage.ts).
 */
export function planBestTurn(
  spells: DamageSpellOption[],
  caster: AttackerProfile,
  target: TargetProfile,
  apBudget: number,
): TurnPlan {
  const critChanceMalus = target.critResistancePercent ?? 0;

  const items = spells
    .filter((s) => s.apCost > 0 && s.apCost <= apBudget)
    .map((spell) => {
      const baseCritPercent = 100 / spell.criticalHitProbability;
      const totalCritPercent = baseCritPercent + caster.combat.critChancePercent - critChanceMalus;
      const { expectedDamage } = computeSpellDamage({
        element: spell.element,
        normalDamage: spell.normalDamage,
        criticalDamage: spell.criticalDamage,
        critChancePercent: totalCritPercent,
        caster,
        targetResistancePercent: target.resistancePercent[spell.element],
        targetResistanceFixed: (target.resistanceFixed ?? ZERO_RESISTANCE)[spell.element],
      });
      return { spell, expectedDamage };
    });

  const n = items.length;
  // dp[i][ap] = meilleurs dégâts atteignables avec les i premiers sorts et ap PA.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(apBudget + 1).fill(0));
  const castsAt: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(apBudget + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { spell, expectedDamage } = items[i - 1];
    const hardMax = spell.maxCastPerTurn > 0 ? spell.maxCastPerTurn : Infinity;
    for (let ap = 0; ap <= apBudget; ap++) {
      let best = dp[i - 1][ap];
      let bestCasts = 0;
      const maxByAp = Math.floor(ap / spell.apCost);
      const maxCasts = Math.min(hardMax, maxByAp);
      for (let casts = 1; casts <= maxCasts; casts++) {
        const value = dp[i - 1][ap - casts * spell.apCost] + casts * expectedDamage;
        if (value > best) {
          best = value;
          bestCasts = casts;
        }
      }
      dp[i][ap] = best;
      castsAt[i][ap] = bestCasts;
    }
  }

  const entries: TurnPlanEntry[] = [];
  let ap = apBudget;
  for (let i = n; i >= 1; i--) {
    const casts = castsAt[i][ap];
    if (casts > 0) {
      const { spell, expectedDamage } = items[i - 1];
      entries.push({
        spellId: spell.spellId,
        name: spell.name,
        casts,
        apCostEach: spell.apCost,
        expectedDamageEach: expectedDamage,
      });
      ap -= casts * spell.apCost;
    }
  }

  const totalApUsed = apBudget - ap;
  return { entries, totalApUsed, totalDamage: dp[n][apBudget] };
}

export interface FightPlan {
  turn: TurnPlan;
  turnsNeeded: number;
  totalDamageDealt: number;
}

/**
 * Simule le combat contre une cible statique (pas de riposte, pas de
 * régénération, pas de changement de résistances) jusqu'à ce que ses PV
 * tombent à 0. Comme rien ne varie d'un tour à l'autre dans cette version,
 * le meilleur tour est identique à chaque tour — TODO : dès qu'on modélise
 * des effets inter-tours (cooldowns, états qui s'accumulent), ce sera une
 * vraie boucle tour par tour plutôt qu'une simple division.
 */
export function planFight(
  spells: DamageSpellOption[],
  caster: AttackerProfile,
  target: TargetProfile,
  apPerTurn: number,
  targetLifePoints: number,
): FightPlan {
  const turn = planBestTurn(spells, caster, target, apPerTurn);
  if (turn.totalDamage <= 0) {
    throw new Error("Aucun sort de dégâts n'est jouable avec ce budget de PA.");
  }
  const turnsNeeded = Math.ceil(targetLifePoints / turn.totalDamage);
  return { turn, turnsNeeded, totalDamageDealt: turn.totalDamage * turnsNeeded };
}

function applyPowerBonus(caster: AttackerProfile, powerBonus: number): AttackerProfile {
  return { ...caster, combat: { ...caster.combat, power: caster.combat.power + powerBonus } };
}

export interface BuffStrategy {
  buff: BuffSpellOption | null;
  turnsNeeded: number;
  /** Dégâts totaux infligés sur `turnsNeeded` tours avec cette stratégie. */
  totalDamage: number;
  firstTurn: TurnPlan;
  boostedTurn: TurnPlan | null;
}

/**
 * Compare "attaquer normalement dès le tour 1" à "sacrifier une partie des
 * PA du tour 1 pour se booster, puis attaquer boosté pendant la durée du
 * buff" pour chaque sort de buff disponible, et renvoie la meilleure
 * stratégie trouvée (le moins de tours pour tuer la cible ; à égalité, le
 * plus de dégâts cumulés).
 *
 * Limite connue (v1) : n'essaie qu'UN SEUL buff à la fois, pas de
 * combinaison de plusieurs buffs simultanés. Ne modélise pas non plus les
 * sorts à double usage (dégâts + buff, ex: "Épée Divine") comme une
 * meilleure "dose gratuite" de buff — le buff est toujours évalué comme un
 * coût net de PA au tour 1.
 */
export function planOptimalFight(
  damageSpells: DamageSpellOption[],
  buffSpells: BuffSpellOption[],
  caster: AttackerProfile,
  target: TargetProfile,
  apPerTurn: number,
  targetLifePoints: number,
): { baseline: BuffStrategy; best: BuffStrategy; allStrategies: BuffStrategy[] } {
  const baselineFight = planFight(damageSpells, caster, target, apPerTurn, targetLifePoints);
  const baseline: BuffStrategy = {
    buff: null,
    turnsNeeded: baselineFight.turnsNeeded,
    totalDamage: baselineFight.totalDamageDealt,
    firstTurn: baselineFight.turn,
    boostedTurn: null,
  };

  const strategies: BuffStrategy[] = [baseline];

  for (const buff of buffSpells) {
    if (buff.apCost > apPerTurn) continue;

    const remainingApTurn1 = apPerTurn - buff.apCost;
    const firstTurn = planBestTurn(damageSpells, caster, target, remainingApTurn1);

    const boostedCaster = applyPowerBonus(caster, buff.powerBonus);
    const boostedTurn = planBestTurn(damageSpells, boostedCaster, target, apPerTurn);

    let remainingHp = targetLifePoints - firstTurn.totalDamage;
    let turns = 1;
    let totalDamage = firstTurn.totalDamage;

    // Le buff dure `durationTurns` tours EN COMPTANT le tour où il est lancé.
    const boostedTurnsLeft = buff.durationTurns - 1;
    for (let t = 0; t < boostedTurnsLeft && remainingHp > 0; t++) {
      remainingHp -= boostedTurn.totalDamage;
      totalDamage += boostedTurn.totalDamage;
      turns++;
    }

    while (remainingHp > 0) {
      remainingHp -= baselineFight.turn.totalDamage;
      totalDamage += baselineFight.turn.totalDamage;
      turns++;
    }

    strategies.push({ buff, turnsNeeded: turns, totalDamage, firstTurn, boostedTurn });
  }

  const best = strategies.reduce((a, b) => {
    if (b.turnsNeeded !== a.turnsNeeded) return b.turnsNeeded < a.turnsNeeded ? b : a;
    return b.totalDamage > a.totalDamage ? b : a;
  });

  return { baseline, best, allStrategies: strategies };
}
