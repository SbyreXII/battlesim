import type { DofusDbMonsterGrade } from "./dofusdb.js";
import type { AttackerProfile } from "../engine/damage.js";
import type { ResistanceProfile } from "../engine/optimizer.js";

/**
 * Adapte un grade de monstre DofusDB au format attendu par le moteur de
 * dégâts. Les caractéristiques (Force/Intelligence/Chance/Agilité) sont
 * mises à 0 : vérifié empiriquement contre dofensive.com qu'elles ne
 * s'ajoutent PAS aux dégâts d'un monstre — voir le commentaire sur
 * `MONSTER_DAMAGE_MULTIPLIER` dans spellCatalog.ts. Les dégâts d'un monstre
 * viennent uniquement des dés du sort (déjà ×2 par `resolveMonsterDamageSpells`)
 * et de `bonusCharacteristics.bonusXDamage`, qui restent appliqués ici.
 */
export function monsterGradeToAttackerProfile(grade: DofusDbMonsterGrade): AttackerProfile {
  return {
    characteristics: {
      strength: 0,
      intelligence: 0,
      chance: 0,
      agility: 0,
    },
    elementalFixedDamage: {
      neutral: 0,
      earth: grade.bonusCharacteristics?.bonusEarthDamage ?? 0,
      fire: grade.bonusCharacteristics?.bonusFireDamage ?? 0,
      water: grade.bonusCharacteristics?.bonusWaterDamage ?? 0,
      air: grade.bonusCharacteristics?.bonusAirDamage ?? 0,
    },
    combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 },
  };
}

export function monsterGradeToResistances(grade: DofusDbMonsterGrade): ResistanceProfile {
  return {
    neutral: grade.neutralResistance,
    earth: grade.earthResistance,
    fire: grade.fireResistance,
    water: grade.waterResistance,
    air: grade.airResistance,
  };
}
