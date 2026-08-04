import {
  getBestSpellLevel,
  getSpellById,
  getSpellLevelForGrade,
  type DofusDbSpellEffect,
  type DofusDbMonster,
  type DofusDbMonsterGrade,
} from "./dofusdb.js";
import { ELEMENT_ID_MAP, ELEMENT_CHARACTERISTIC, type Element, type DamageRoll } from "../engine/damage.js";

/**
 * effectId Ankama "#1 à #2 dommages {élément}", un par élément (vérifié sur
 * DofusDB /effects : 96=Eau, 97=Terre, 98=Air, 99=Feu, 100=Neutre).
 * Les effets "vol {élément}" (91-95, dégâts + soin du lanceur) ne sont pas
 * inclus pour l'instant — sémantique différente (vol de vie), pas géré.
 */
const DAMAGE_EFFECT_IDS = new Set([96, 97, 98, 99, 100]);

export interface DamageSpellOption {
  spellId: number;
  name: string;
  grade: number;
  apCost: number;
  /** Nombre de lancers autorisés par tour (0 = illimité côté DofusDB). */
  maxCastPerTurn: number;
  /** Nombre de lancers autorisés sur UNE MÊME CIBLE, cumulé sur tout le combat (0 = illimité). */
  maxCastPerTarget: number;
  range: number;
  element: Element;
  normalDamage: DamageRoll;
  criticalDamage: DamageRoll;
  criticalHitProbability: number;
}

function findDamageEffect(effects: DofusDbSpellEffect[]): DofusDbSpellEffect | undefined {
  return effects.find((e) => DAMAGE_EFFECT_IDS.has(e.effectId) && e.effectElement >= 0);
}

/**
 * Résout un sort en option de dégâts exploitable par l'optimiseur, ou `null`
 * si ce n'est pas un sort de dégâts direct (soin, buff, déplacement...).
 *
 * Limite connue : pour les sorts dont les dégâts dépendent d'un état de jeu
 * (ex: "Fureur" qui augmente à chaque lancer, "Épée du Destin" qui augmente
 * à la récupération, "Tempête de Puissance" qui touche une autre cible que
 * le lanceur) on ne récupère que la valeur de base du sort, sans le bonus
 * conditionnel — sous-estimation assumée, pas une erreur de lecture des
 * données.
 */
export async function resolveDamageSpell(
  spellId: number,
  characterLevel: number,
): Promise<DamageSpellOption | null> {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getBestSpellLevel(spellId, characterLevel),
  ]);

  const normalEffect = findDamageEffect(spellLevel.effects);
  if (!normalEffect) return null;
  const criticalEffect = findDamageEffect(spellLevel.criticalEffect) ?? normalEffect;

  return {
    spellId,
    name: spell.name.fr,
    grade: spellLevel.grade,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    maxCastPerTarget: spellLevel.maxCastPerTarget,
    range: spellLevel.range,
    element: ELEMENT_ID_MAP[normalEffect.effectElement],
    normalDamage: { min: normalEffect.diceNum, max: normalEffect.diceSide },
    criticalDamage: { min: criticalEffect.diceNum, max: criticalEffect.diceSide },
    criticalHitProbability: spellLevel.criticalHitProbability,
  };
}

/** Résout une liste de sorts en ignorant ceux qui ne sont pas des sorts de dégâts directs. */
export async function resolveDamageSpells(
  spellIds: number[],
  characterLevel: number,
): Promise<DamageSpellOption[]> {
  const resolved = await Promise.all(
    spellIds.map((id) => resolveDamageSpell(id, characterLevel)),
  );
  return resolved.filter((s): s is DamageSpellOption => s !== null);
}

export interface SpellResolutionCoverage {
  resolved: DamageSpellOption[];
  /** Noms des sorts qui n'ont pas donné de sort de dégâts direct (soin, buff, déplacement...). */
  unresolvedNames: string[];
}

/**
 * Comme `resolveDamageSpells`, mais renvoie aussi le nom des sorts non
 * résolus — utilisé pour afficher à l'utilisateur *lesquels* de ses sorts
 * ne sont pas pris en compte dans le calcul, pas juste un compteur.
 */
export async function resolveDamageSpellsWithCoverage(
  spellIds: number[],
  characterLevel: number,
): Promise<SpellResolutionCoverage> {
  const pairs = await Promise.all(
    spellIds.map(async (id) => {
      const [option, spell] = await Promise.all([resolveDamageSpell(id, characterLevel), getSpellById(id)]);
      return { option, name: spell.name.fr };
    }),
  );
  return {
    resolved: pairs.filter((p): p is { option: DamageSpellOption; name: string } => p.option !== null).map((p) => p.option),
    unresolvedNames: pairs.filter((p) => p.option === null).map((p) => p.name),
  };
}

/**
 * Formule des dégâts de MONSTRE, vérifiée empiriquement contre dofensive.com
 * sur 2 sorts de 2 monstres différents (dégâts normaux ET critiques, 4
 * valeurs comparées) :
 *
 *   dégâts affichés = dés bruts DofusDB × (1 + caractéristique/100)
 *
 * où "caractéristique" suit le même mapping élémentaire que pour un joueur
 * (Terre→Force, Feu→Intelligence, Eau→Chance, Air→Agilité) :
 *   - Boule de Neige (Eau, monstre à 100 Chance) : 151-200 × (1+100/100) = 302-400 ✓
 *   - Grift (Terre, monstre à 800 Force) : 101-110 × (1+800/100) = 909-990 ✓
 *
 * Contrairement à ma première hypothèse (×2 fixe), ce n'est PAS une
 * constante : ça dépend bien de la caractéristique du monstre pour
 * l'élément du sort. Les caractéristiques du monstre n'interviennent QUE
 * comme multiplicateur ici (pas d'ajout en plus), d'où
 * `monsterGradeToAttackerProfile` qui les met à 0 côté `AttackerProfile`
 * (sinon elles seraient comptées deux fois par `computeSpellDamage`).
 *
 * Cas non résolu : les sorts Neutre n'ont pas de caractéristique associée
 * (comme pour les joueurs), donc multiplicateur ×1 ici. Pas pu le vérifier
 * précisément — mais en sondant plusieurs monstres sur DofusDB (Sylargh,
 * Klime, Grozilla, Comte Harebourg, Missiz Frizz...), il s'avère que
 * l'écrasante majorité ont leurs 4 caractéristiques STRICTEMENT ÉGALES —
 * Minotoboule de Nowel (100/500/100/300), le seul cas testé avec des
 * dégâts Neutre, est plutôt une exception. Ça limite beaucoup l'impact
 * pratique de cette incertitude : sur la plupart des monstres, peu importe
 * laquelle des 4 caractéristiques s'applique au Neutre, le résultat serait
 * identique. Reste à vérifier sur un monstre aux caractéristiques
 * différenciées ET un sort Neutre si l'occasion se présente.
 */
function monsterDamageMultiplier(element: Element, grade: DofusDbMonsterGrade): number {
  const key = ELEMENT_CHARACTERISTIC[element];
  if (!key) return 1;
  const characteristicValue = { strength: grade.strength, intelligence: grade.intelligence, chance: grade.chance, agility: grade.agility }[key];
  return 1 + characteristicValue / 100;
}

function parseSpellGradeForMonsterGrade(spellGradesEntry: string, monsterGrade: number): number {
  const pairs = spellGradesEntry.split(";").map((p) => Number(p.split(",")[0]));
  return pairs[monsterGrade - 1] ?? pairs[pairs.length - 1] ?? 1;
}

async function resolveMonsterDamageSpell(
  spellId: number,
  spellGrade: number,
  monsterGrade: DofusDbMonsterGrade,
): Promise<DamageSpellOption | null> {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getSpellLevelForGrade(spellId, spellGrade),
  ]);

  const normalEffect = findDamageEffect(spellLevel.effects);
  if (!normalEffect) return null;
  const criticalEffect = findDamageEffect(spellLevel.criticalEffect) ?? normalEffect;
  const element = ELEMENT_ID_MAP[normalEffect.effectElement];
  const multiplier = monsterDamageMultiplier(element, monsterGrade);

  return {
    spellId,
    name: spell.name.fr,
    grade: spellLevel.grade,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    maxCastPerTarget: spellLevel.maxCastPerTarget,
    range: spellLevel.range,
    element,
    normalDamage: {
      min: normalEffect.diceNum * multiplier,
      max: normalEffect.diceSide * multiplier,
    },
    criticalDamage: {
      min: criticalEffect.diceNum * multiplier,
      max: criticalEffect.diceSide * multiplier,
    },
    criticalHitProbability: spellLevel.criticalHitProbability,
  };
}

/** Résout les sorts de dégâts d'un monstre, au grade réellement utilisé par ce monstre (pas "le plus haut"). */
export async function resolveMonsterDamageSpells(
  monster: DofusDbMonster,
  grade: DofusDbMonsterGrade,
): Promise<DamageSpellOption[]> {
  const resolved = await Promise.all(
    monster.spells.map((spellId, i) => {
      const spellGrade = parseSpellGradeForMonsterGrade(monster.spellGrades[i] ?? "1,0", grade.grade);
      return resolveMonsterDamageSpell(spellId, spellGrade, grade);
    }),
  );
  return resolved.filter((s): s is DamageSpellOption => s !== null);
}

/**
 * effectId Ankama pour les buffs de dégâts sur le lanceur :
 * 138 = "+X Puissance", 112 = "+X Dommages" (générique, tous éléments).
 * Vérifiés sur DofusDB via les sorts Iop "Puissance" (138) et "Épée Divine"
 * (112, en plus de ses dégâts). Les deux sont traités comme équivalents ici
 * (bonus plat toutes éléments) car notre formule ne distingue pas encore
 * Puissance et Dommages génériques.
 *
 * Hypothèse non vérifiée : on suppose que ces effets ciblent le lanceur —
 * confirmé par connaissance du jeu pour ces deux sorts précis, pas déduit du
 * `targetMask` (sémantique de ce champ pas encore établie avec certitude).
 */
const SELF_DAMAGE_BUFF_EFFECT_IDS = new Set([138, 112]);

export interface BuffSpellOption {
  spellId: number;
  name: string;
  apCost: number;
  maxCastPerTurn: number;
  /** Durée du buff en tours (le tour du lancer compris). */
  durationTurns: number;
  /** Bonus de dégâts plat, toutes éléments (équivalent Puissance/Dommages dans notre modèle). */
  powerBonus: number;
}

export async function resolveBuffSpell(
  spellId: number,
  characterLevel: number,
): Promise<BuffSpellOption | null> {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getBestSpellLevel(spellId, characterLevel),
  ]);

  const buffEffects = spellLevel.effects.filter((e) => SELF_DAMAGE_BUFF_EFFECT_IDS.has(e.effectId));
  if (buffEffects.length === 0) return null;

  const powerBonus = buffEffects.reduce((sum, e) => sum + e.diceNum, 0);
  const durationTurns = Math.max(...buffEffects.map((e) => e.duration), 1);

  return {
    spellId,
    name: spell.name.fr,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    durationTurns,
    powerBonus,
  };
}

export async function resolveBuffSpells(
  spellIds: number[],
  characterLevel: number,
): Promise<BuffSpellOption[]> {
  const resolved = await Promise.all(spellIds.map((id) => resolveBuffSpell(id, characterLevel)));
  return resolved.filter((s): s is BuffSpellOption => s !== null);
}
