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
 * `maxCastPerTurn`, du budget de PA, et — si `remainingCasts` est fourni —
 * du nombre de lancers qu'il lui reste sur CETTE cible pour le reste du
 * combat (`maxCastPerTarget`). Les dégâts par sort sont pris en espérance
 * (cf. engine/damage.ts).
 */
export function planBestTurn(
  spells: DamageSpellOption[],
  caster: AttackerProfile,
  target: TargetProfile,
  apBudget: number,
  remainingCasts?: Map<number, number>,
): TurnPlan {
  const critChanceMalus = target.critResistancePercent ?? 0;

  const items = spells
    .filter((s) => s.apCost > 0 && s.apCost <= apBudget)
    .filter((s) => (remainingCasts?.get(s.spellId) ?? Infinity) > 0)
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
    const perTurnMax = spell.maxCastPerTurn > 0 ? spell.maxCastPerTurn : Infinity;
    const perTargetMax = remainingCasts?.get(spell.spellId) ?? Infinity;
    const hardMax = Math.min(perTurnMax, perTargetMax);
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

/** Filet de sécurité : si les limites de lancers par cible rendent la cible
 * impossible à tuer avec les sorts modélisés, on ne boucle pas indéfiniment. */
const MAX_SIMULATED_TURNS = 500;

export function initialRemainingCasts(spells: DamageSpellOption[]): Map<number, number> {
  return new Map(spells.map((s) => [s.spellId, s.maxCastPerTarget > 0 ? s.maxCastPerTarget : Infinity]));
}

/**
 * Simule un combat tour par tour jusqu'à ce que la cible tombe à 0 PV, en
 * respectant `maxCastPerTarget` d'un tour sur l'autre (une fois un sort épuisé
 * sur cette cible, il n'est plus proposé). `casterForTurn` permet de faire
 * varier le lanceur/budget de PA selon le tour (ex: tour de buff, sorts
 * boostés pendant N tours, puis retour à la normale).
 */
function simulateFight(
  spells: DamageSpellOption[],
  target: TargetProfile,
  targetLifePoints: number,
  casterForTurn: (turnIndex: number) => { caster: AttackerProfile; apBudget: number },
): { turns: TurnPlan[]; turnsNeeded: number; totalDamage: number } {
  const remaining = initialRemainingCasts(spells);
  let hp = targetLifePoints;
  let totalDamage = 0;
  const turns: TurnPlan[] = [];
  let turnIndex = 0;

  while (hp > 0) {
    turnIndex++;
    if (turnIndex > MAX_SIMULATED_TURNS) {
      throw new Error(
        `Impossible de tuer la cible avec les sorts disponibles au-delà de ${MAX_SIMULATED_TURNS} tours ` +
          `— probablement parce que les sorts de dégâts ont atteint leur nombre maximum de lancers sur cette cible.`,
      );
    }
    const { caster, apBudget } = casterForTurn(turnIndex);
    const turn = planBestTurn(spells, caster, target, apBudget, remaining);
    if (turn.totalDamage <= 0) {
      throw new Error(
        "Aucun sort de dégâts n'est jouable (PA insuffisants, ou tous les sorts ont atteint leur limite de lancers sur cette cible).",
      );
    }
    for (const entry of turn.entries) {
      remaining.set(entry.spellId, (remaining.get(entry.spellId) ?? Infinity) - entry.casts);
    }
    hp -= turn.totalDamage;
    totalDamage += turn.totalDamage;
    turns.push(turn);
  }

  return { turns, turnsNeeded: turnIndex, totalDamage };
}

export interface FightPlan {
  turn: TurnPlan;
  turnsNeeded: number;
  totalDamageDealt: number;
}

/**
 * Simule le combat contre une cible statique (pas de riposte, pas de
 * régénération, pas de changement de résistances) jusqu'à ce que ses PV
 * tombent à 0, en respectant `maxCastPerTarget`. `turn` renvoyé est celui du
 * premier tour — les tours suivants peuvent différer une fois un sort épuisé
 * sur cette cible.
 */
export function planFight(
  spells: DamageSpellOption[],
  caster: AttackerProfile,
  target: TargetProfile,
  apPerTurn: number,
  targetLifePoints: number,
): FightPlan {
  const { turns, turnsNeeded, totalDamage } = simulateFight(spells, target, targetLifePoints, () => ({
    caster,
    apBudget: apPerTurn,
  }));
  return { turn: turns[0], turnsNeeded, totalDamageDealt: totalDamage };
}

function applyPowerBonus(caster: AttackerProfile, powerBonus: number): AttackerProfile {
  return { ...caster, combat: { ...caster.combat, power: caster.combat.power + powerBonus } };
}

/**
 * Construit la fonction "lanceur/PA par tour" pour une stratégie donnée
 * (pas de buff, ou buff au tour 1 puis boost pendant sa durée). Partagée
 * entre `planOptimalFight` et `simulateRace` pour que la course tienne
 * compte de la même stratégie que celle recommandée comme "meilleure".
 */
export function casterScheduleFor(
  caster: AttackerProfile,
  buff: BuffSpellOption | null,
  apPerTurn: number,
): (turnIndex: number) => { caster: AttackerProfile; apBudget: number } {
  if (!buff) return () => ({ caster, apBudget: apPerTurn });
  const boostedCaster = applyPowerBonus(caster, buff.powerBonus);
  return (turnIndex) => {
    if (turnIndex === 1) return { caster, apBudget: apPerTurn - buff.apCost };
    if (turnIndex <= buff.durationTurns) return { caster: boostedCaster, apBudget: apPerTurn };
    return { caster, apBudget: apPerTurn };
  };
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
 * plus de dégâts cumulés). Chaque stratégie respecte `maxCastPerTarget`
 * indépendamment (compteur repartant de zéro pour chaque simulation).
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

    const { turns, turnsNeeded, totalDamage } = simulateFight(
      damageSpells,
      target,
      targetLifePoints,
      casterScheduleFor(caster, buff, apPerTurn),
    );

    strategies.push({
      buff,
      turnsNeeded,
      totalDamage,
      firstTurn: turns[0],
      boostedTurn: turns.length > 1 ? turns[1] : null,
    });
  }

  const best = strategies.reduce((a, b) => {
    if (b.turnsNeeded !== a.turnsNeeded) return b.turnsNeeded < a.turnsNeeded ? b : a;
    return b.totalDamage > a.totalDamage ? b : a;
  });

  return { baseline, best, allStrategies: strategies };
}

export interface RaceRound {
  round: number;
  playerTurn: TurnPlan;
  /** null si le monstre est mort avant d'avoir pu agir ce tour. */
  monsterTurn: TurnPlan | null;
}

export interface RaceResult {
  outcome: "player_wins" | "monster_wins";
  /** null si ce camp n'est jamais tombé (c'est l'autre qui a gagné avant). */
  turnsToKillMonster: number | null;
  turnsToKillPlayer: number | null;
  rounds: RaceRound[];
}

const MAX_RACE_ROUNDS = 500;

/**
 * Simule le combat tour par tour dans les DEUX sens à la fois (joueur puis
 * monstre, à tour de rôle) pour déterminer qui meurt en premier. Respecte
 * `maxCastPerTarget` indépendamment pour chaque camp.
 *
 * Hypothèses assumées (non vérifiées, à garder en tête) :
 * - Le joueur agit toujours en premier à chaque round (pas de vraie gestion
 *   d'initiative — si le monstre a l'initiative en jeu, ses PA sont
 *   effectivement "un coup d'avance" par rapport à ce que ce calcul montre).
 * - `playerLifePoints` n'est qu'une approximation (Vitalité brute, sans les
 *   PV de base liés à la classe/au niveau) — la vraie valeur en jeu est
 *   probablement plus élevée, donc ce calcul est pessimiste pour le joueur.
 */
export function simulateRace(
  playerSpells: DamageSpellOption[],
  playerCasterForTurn: (turnIndex: number) => { caster: AttackerProfile; apBudget: number },
  monsterTarget: TargetProfile,
  monsterLifePoints: number,
  monsterSpells: DamageSpellOption[],
  monsterCaster: AttackerProfile,
  monsterApPerTurn: number,
  playerTarget: TargetProfile,
  playerLifePoints: number,
): RaceResult {
  const playerRemaining = initialRemainingCasts(playerSpells);
  const monsterRemaining = initialRemainingCasts(monsterSpells);
  let monsterHp = monsterLifePoints;
  let playerHp = playerLifePoints;
  const rounds: RaceRound[] = [];
  let round = 0;

  while (monsterHp > 0 && playerHp > 0) {
    round++;
    if (round > MAX_RACE_ROUNDS) {
      throw new Error(
        `Aucun des deux camps ne meurt au-delà de ${MAX_RACE_ROUNDS} tours ` +
          `— probablement parce que les sorts disponibles ont atteint leurs limites de lancers par cible des deux côtés.`,
      );
    }

    const { caster, apBudget } = playerCasterForTurn(round);
    const playerTurn = planBestTurn(playerSpells, caster, monsterTarget, apBudget, playerRemaining);
    for (const e of playerTurn.entries) {
      playerRemaining.set(e.spellId, (playerRemaining.get(e.spellId) ?? Infinity) - e.casts);
    }
    monsterHp -= playerTurn.totalDamage;

    if (monsterHp <= 0) {
      rounds.push({ round, playerTurn, monsterTurn: null });
      break;
    }

    const monsterTurn = planBestTurn(monsterSpells, monsterCaster, playerTarget, monsterApPerTurn, monsterRemaining);
    for (const e of monsterTurn.entries) {
      monsterRemaining.set(e.spellId, (monsterRemaining.get(e.spellId) ?? Infinity) - e.casts);
    }
    playerHp -= monsterTurn.totalDamage;

    rounds.push({ round, playerTurn, monsterTurn });
  }

  return {
    outcome: monsterHp <= 0 ? "player_wins" : "monster_wins",
    turnsToKillMonster: monsterHp <= 0 ? round : null,
    turnsToKillPlayer: playerHp <= 0 ? round : null,
    rounds,
  };
}
