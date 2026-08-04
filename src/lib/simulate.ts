import { parseStuffJson } from "./dofusbookParser.js";
import { computeCharacterStats } from "./characterStats.js";
import { getBreedById } from "./dofusdb.js";
import { resolveDamageSpells, resolveBuffSpells, resolveMonsterDamageSpells } from "./spellCatalog.js";
import { resolveWeaponAttack } from "./weaponAttack.js";
import { assessKiteFeasibility, splitMonsterSpellsByRange } from "./kiteAnalysis.js";
import { parseDofensiveLink } from "./dofensiveParser.js";
import {
  planOptimalFight,
  simulateRace,
  casterScheduleFor,
  type TargetProfile,
  type TurnPlan,
} from "../engine/optimizer.js";
import { monsterGradeToAttackerProfile, monsterGradeToResistances } from "./monsterStats.js";

export interface SimulationInput {
  stuffJson: string;
  monsterLink: string;
  /** PA/tour du joueur. TODO : dériver automatiquement (base + objets + monture). */
  apOverride?: number;
  /**
   * PV réels du joueur (visibles dans la fiche personnage en jeu). Sans ça,
   * on retombe sur une approximation par la Vitalité seule, qui sous-estime
   * fortement (elle ignore les PV de base classe/niveau ET le bonus des
   * parchemins de Vitalité — cf. commentaire sur `playerLifePointsApprox`).
   */
  playerLifePointsOverride?: number;
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
  race: {
    outcome: "player_wins" | "monster_wins";
    turnsToKillMonster: number | null;
    turnsToKillPlayer: number | null;
    playerLifePoints: number;
    /** false si `playerLifePointsOverride` a été fourni en entrée (valeur réelle, fiable). */
    playerLifePointsIsApprox: boolean;
  };
  /**
   * Estimation très simplifiée (pas de vrai modèle positionnel — voir
   * kiteAnalysis.ts) : si `possible`, résultat de la course en supposant que
   * le joueur reste hors de portée des sorts de mêlée du monstre (portée
   * ≤ 1) pendant tout le combat.
   */
  kite: {
    possible: boolean;
    reason: string;
    outcome: "player_wins" | "monster_wins" | null;
    turnsToKillMonster: number | null;
    turnsToKillPlayer: number | null;
  };
}

const EMPTY_TURN_VIEW: TurnPlanView = { entries: [], totalApUsed: 0, totalDamage: 0 };

/** "Puissance", "Puissance + Épée Divine", ou null si aucun buff dans le groupe. */
function buffsLabel(buffs: { name: string }[]): string | null {
  return buffs.length > 0 ? buffs.map((b) => b.name).join(" + ") : null;
}

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const stuff = parseStuffJson(input.stuffJson);
  const stats = computeCharacterStats(stuff);
  const apPerTurn = input.apOverride ?? stats.actionPoints;

  const breed = await getBreedById(stuff.character_class);
  const [spellDamageOptions, buffSpells] = await Promise.all([
    resolveDamageSpells(breed.breedSpellsId, stuff.character_level),
    resolveBuffSpells(breed.breedSpellsId, stuff.character_level),
  ]);
  const weaponAttack = resolveWeaponAttack(stuff);
  const damageSpells = weaponAttack ? [...spellDamageOptions, weaponAttack] : spellDamageOptions;

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

  const monsterSpells = await resolveMonsterDamageSpells(monster, grade);
  const monsterAttacker = monsterGradeToAttackerProfile(grade);
  const playerTarget: TargetProfile = {
    resistancePercent: stats.defense.resistancePercent,
    resistanceFixed: stats.defense.resistanceFixed,
    critResistancePercent: stats.defense.critResistancePercent,
  };

  // Approximation grossière et sous-estimée si pas d'override fourni : la
  // Vitalité seule ignore les PV de base classe/niveau ET le bonus des
  // parchemins de Vitalité (vérifié avec un utilisateur : ~4300 PV réels en
  // jeu contre une bien plus petite approximation par ce calcul).
  const playerLifePointsIsApprox = input.playerLifePointsOverride === undefined;
  const playerLifePoints = input.playerLifePointsOverride ?? Math.round(stats.characteristics.vitality);

  const race = simulateRace(
    damageSpells,
    casterScheduleFor(stats, best.buffs, apPerTurn),
    monsterTarget,
    grade.lifePoints,
    monsterSpells,
    monsterAttacker,
    grade.actionPoints,
    playerTarget,
    playerLifePoints,
  );
  const firstRound = race.rounds[0];

  const kiteFeasibility = assessKiteFeasibility(damageSpells, stats.movementPoints, grade.movementPoints);
  const kite: SimulationResult["kite"] = kiteFeasibility.possible
    ? (() => {
        const { ranged } = splitMonsterSpellsByRange(monsterSpells);
        const kiteRace = simulateRace(
          damageSpells,
          casterScheduleFor(stats, best.buffs, apPerTurn),
          monsterTarget,
          grade.lifePoints,
          ranged,
          monsterAttacker,
          grade.actionPoints,
          playerTarget,
          playerLifePoints,
        );
        return {
          possible: true,
          reason: kiteFeasibility.reason,
          outcome: kiteRace.outcome,
          turnsToKillMonster: kiteRace.turnsToKillMonster,
          turnsToKillPlayer: kiteRace.turnsToKillPlayer,
        };
      })()
    : { possible: false, reason: kiteFeasibility.reason, outcome: null, turnsToKillMonster: null, turnsToKillPlayer: null };

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
      damageResolved: spellDamageOptions.length,
      damageTotal: breed.breedSpellsId.length,
      buffResolved: buffSpells.length,
    },
    playerAttack: {
      baselineTurnsNeeded: baseline.turnsNeeded,
      baselineTurn: toView(baseline.firstTurn),
      bestTurnsNeeded: best.turnsNeeded,
      bestBuffName: buffsLabel(best.buffs),
      strategies: allStrategies.map((s) => ({
        buffName: buffsLabel(s.buffs),
        turnsNeeded: s.turnsNeeded,
        firstTurn: toView(s.firstTurn),
        boostedTurn: s.boostedTurn ? toView(s.boostedTurn) : null,
      })),
    },
    monsterAttack: {
      apBudget: grade.actionPoints,
      turn: firstRound.monsterTurn ? toView(firstRound.monsterTurn) : EMPTY_TURN_VIEW,
      spellCoverage: { resolved: monsterSpells.length, total: monster.spells.length },
    },
    race: {
      outcome: race.outcome,
      turnsToKillMonster: race.turnsToKillMonster,
      turnsToKillPlayer: race.turnsToKillPlayer,
      playerLifePoints,
      playerLifePointsIsApprox,
    },
    kite,
  };
}
