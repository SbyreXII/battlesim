export type Element = "neutral" | "earth" | "fire" | "water" | "air";

/**
 * Sous-ensemble des stats nécessaires pour infliger des dégâts. Un
 * `CharacterStats` (joueur) le satisfait structurellement ; un monstre passe
 * par `lib/monsterStats.ts` pour produire la même forme, ce qui permet de
 * réutiliser exactement la même formule dans les deux sens (joueur → monstre
 * et monstre → joueur).
 */
export interface AttackerProfile {
  characteristics: Record<"strength" | "intelligence" | "chance" | "agility", number>;
  elementalFixedDamage: Record<Element, number>;
  combat: { power: number; critDamageBonus: number; critChancePercent: number };
}

/** Mapping des elementId DofusDB (déduit empiriquement : "Couperet" est un
 * sort Feu connu et renvoie effectElement=2, ce qui donne l'ordre standard
 * du jeu Neutre/Terre/Feu/Eau/Air). */
export const ELEMENT_ID_MAP: Record<number, Element> = {
  0: "neutral",
  1: "earth",
  2: "fire",
  3: "water",
  4: "air",
};

export const ELEMENT_CHARACTERISTIC: Partial<Record<Element, keyof AttackerProfile["characteristics"]>> = {
  earth: "strength",
  fire: "intelligence",
  water: "chance",
  air: "agility",
};

export interface DamageRoll {
  min: number;
  max: number;
}

export interface DamageComputationInput {
  element: Element;
  normalDamage: DamageRoll;
  criticalDamage: DamageRoll;
  /** Chance de critique combinée (base du sort + bonus d'équipement), 0-100. */
  critChancePercent: number;
  caster: AttackerProfile;
  /** Résistance % de la cible pour cet élément (peut être négative = faiblesse). */
  targetResistancePercent: number;
  targetResistanceFixed?: number;
}

export interface DamageResult {
  averageNormalHit: number;
  averageCriticalHit: number;
  /** Dégâts moyens en espérance, pondérés par la chance de critique. */
  expectedDamage: number;
}

/**
 * Convention DofusDB (cf. `DofusDbSpellEffect.diceSide` dans dofusdb.ts) :
 * `diceSide = 0` ne veut PAS dire "borne haute à 0", ça veut dire "pas de
 * jet, valeur fixe = diceNum" (cas très courant : beaucoup de sorts n'ont
 * aucun aléatoire). Vérifié sur "Substitution Funèbre" (monstre Gein,
 * diceNum=40, diceSide=0) : dofensive.com affiche 520 dégâts (40 × (1+1200/100)),
 * alors qu'une simple moyenne (min+max)/2 donnait 260 — exactement moitié
 * moins, le bug était systématique sur tout sort à dégâts fixes (joueur ET
 * monstre), silencieux jusqu'ici car les sorts déjà vérifiés (Boule de
 * Neige, Grift) ont un vrai intervalle (diceSide > 0).
 */
function average(roll: DamageRoll): number {
  if (roll.max === 0) return roll.min;
  return (roll.min + roll.max) / 2;
}

/**
 * Formule de dégâts (approximation du système actuel de Dofus) :
 *   1. jet de base (moyenne min/max du sort)
 *   2. + caractéristique élémentaire du lanceur (Force→Terre, Intelligence→Feu,
 *      Chance→Eau, Agilité→Air ; le Neutre n'en bénéficie pas)
 *   3. + dommages fixes de l'élément concerné (objets)
 *   4. + Puissance (bonus générique toutes éléments)
 *   5. sur critique : + bonus "Dommages Critiques" fixe
 *   6. résistance cible : d'abord le %, puis le fixe, plancher à 0
 *
 * Simplifications connues (TODO) : pas de bonus % de dégâts (spécifique au
 * sort / élémentaire / finaux — peu présents sur ce stuff d'exemple), pas de
 * gestion des effets conditionnels/scriptés (états, stacks, passifs de
 * panoplie), pas de dégâts d'arme séparés.
 */
export function computeSpellDamage(input: DamageComputationInput): DamageResult {
  const { element, caster, targetResistancePercent, targetResistanceFixed = 0 } = input;

  const characteristicKey = ELEMENT_CHARACTERISTIC[element];
  const characteristicBonus = characteristicKey ? caster.characteristics[characteristicKey] : 0;
  const fixedElementalBonus = caster.elementalFixedDamage[element];
  const powerBonus = caster.combat.power;

  const flatBonus = characteristicBonus + fixedElementalBonus + powerBonus;

  const normalHit = applyResistance(
    average(input.normalDamage) + flatBonus,
    targetResistancePercent,
    targetResistanceFixed,
  );
  const criticalHit = applyResistance(
    average(input.criticalDamage) + flatBonus + caster.combat.critDamageBonus,
    targetResistancePercent,
    targetResistanceFixed,
  );

  const critChance = Math.max(0, Math.min(100, input.critChancePercent)) / 100;
  const expectedDamage = normalHit * (1 - critChance) + criticalHit * critChance;

  return { averageNormalHit: normalHit, averageCriticalHit: criticalHit, expectedDamage };
}

function applyResistance(damage: number, resistancePercent: number, resistanceFixed: number): number {
  const afterPercent = damage * (1 - resistancePercent / 100);
  const afterFixed = afterPercent - resistanceFixed;
  return Math.max(0, Math.round(afterFixed));
}
