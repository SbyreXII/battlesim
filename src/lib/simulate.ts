import { parseStuffJson } from "./dofusbookParser.js";
import { computeCharacterStats } from "./characterStats.js";
import { getBreedById } from "./dofusdb.js";
import { resolveDamageSpells, resolveBuffSpells } from "./spellCatalog.js";
import { parseDofensiveLink } from "./dofensiveParser.js";
import { planBestTurn, planOptimalFight, type TargetProfile, type TurnPlan } from "../engine/optimizer.js";
import { monsterGradeToAttackerProfile, monsterGradeToResistances } from "./monsterStats.js";

export interface SimulationInput {
  stuffJson: string;
  monsterLink: string;
  /** PA/tour du joueur. TODO : dériver automatiquement (base + objets + monture). */
  apOverride?: number;
}

export interface TurnPlanView {
  entries: { name: string; casts: number; apCostEach: number; damage: number }[];
  totalApUsed: number;
  totalDamage: number;
}

function toView(turn: TurnPlan): TurnPlanView {
  return {
    entries: turn.entries.map((e) => ({
      name: e.name,
      casts: e.casts,
      apCostEach: e.apCostEach,
      damage: Math.round(e.casts * e.expectedDamageEach),
    })),
    totalApUsed: turn.totalApUsed,
    totalDamage: Math.round(turn.totalDamage),
  };
}

export interface SimulationResult {
  character: {
    name: string;
    className: number;
    level: number;
    apPerTurn: number;
    intelligence: number;
    strength: number;
    chance: number;
    agility: number;
    vitality: number;
  };
  monster: {
    name: string;
    grade: number;
    level: number;
    lifePoints: number;
    actionPoints: number;
  };
  spellCoverage: {
    damageResolved: number;
    damageTotal: number;
    buffResolved: number;
  };
  playerAttack: {
    baselineTurnsNeeded: number;
    baselineTurn: TurnPlanView;
    bestTurnsNeeded: number;
    bestBuffName: string | null;
    strategies: {
      buffName: string | null;
      turnsNeeded: number;
      firstTurn: TurnPlanView;
      boostedTurn: TurnPlanView | null;
    }[];
  };
  monsterAttack: {
    apBudget: number;
    turn: TurnPlanView;
    spellCoverage: { resolved: number; total: number };
  };
}

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const stuff = parseStuffJson(input.stuffJson);
  const stats = computeCharacterStats(stuff);
  const apPerTurn = input.apOverride ?? stats.actionPoints;

  const breed = await getBreedById(stuff.character_class);
  const [damageSpells, buffSpells] = await Promise.all([
    resolveDamageSpells(breed.breedSpellsId, stuff.character_level),
    resolveBuffSpells(breed.breedSpellsId, stuff.character_level),
  ]);

  const { monster, grade } = await parseDofensiveLink(input.monsterLink);
  const monsterTarget: TargetProfile = { resistancePercent: monsterGradeToResistances(grade) };

  const { baseline, best, allStrategies } = planOptimalFight(
    damageSpells,
    buffSpells,
    stats,
    monsterTarget,
    apPerTurn,
    grade.lifePoints,
  );

  const monsterSpells = await resolveDamageSpells(monster.spells, grade.level);
  const monsterAttacker = monsterGradeToAttackerProfile(grade);
  const playerTarget: TargetProfile = {
    resistancePercent: stats.defense.resistancePercent,
    resistanceFixed: stats.defense.resistanceFixed,
    critResistancePercent: stats.defense.critResistancePercent,
  };
  const monsterTurn = planBestTurn(monsterSpells, monsterAttacker, playerTarget, grade.actionPoints);

  return {
    character: {
      name: stuff.name,
      className: stuff.character_class,
      level: stuff.character_level,
      apPerTurn,
      intelligence: Math.round(stats.characteristics.intelligence),
      strength: Math.round(stats.characteristics.strength),
      chance: Math.round(stats.characteristics.chance),
      agility: Math.round(stats.characteristics.agility),
      vitality: Math.round(stats.characteristics.vitality),
    },
    monster: {
      name: monster.name.fr,
      grade: grade.grade,
      level: grade.level,
      lifePoints: grade.lifePoints,
      actionPoints: grade.actionPoints,
    },
    spellCoverage: {
      damageResolved: damageSpells.length,
      damageTotal: breed.breedSpellsId.length,
      buffResolved: buffSpells.length,
    },
    playerAttack: {
      baselineTurnsNeeded: baseline.turnsNeeded,
      baselineTurn: toView(baseline.firstTurn),
      bestTurnsNeeded: best.turnsNeeded,
      bestBuffName: best.buff?.name ?? null,
      strategies: allStrategies.map((s) => ({
        buffName: s.buff?.name ?? null,
        turnsNeeded: s.turnsNeeded,
        firstTurn: toView(s.firstTurn),
        boostedTurn: s.boostedTurn ? toView(s.boostedTurn) : null,
      })),
    },
    monsterAttack: {
      apBudget: grade.actionPoints,
      turn: toView(monsterTurn),
      spellCoverage: { resolved: monsterSpells.length, total: monster.spells.length },
    },
  };
}
