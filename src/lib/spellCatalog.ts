import { getBestSpellLevel, getSpellById, type DofusDbSpellEffect } from "./dofusdb.js";
import { ELEMENT_ID_MAP, type Element, type DamageRoll } from "../engine/damage.js";

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
  /** Nombre de lancers autorisés sur une même cible par tour (0 = illimité côté DofusDB). */
  maxCastPerTurn: number;
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
