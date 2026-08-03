import type { DofusDbMonsterGrade } from "./dofusdb.js";
import type { AttackerProfile } from "../engine/damage.js";
import type { ResistanceProfile } from "../engine/optimizer.js";

/** Adapte un grade de monstre DofusDB au format attendu par le moteur de dégâts. */
export function monsterGradeToAttackerProfile(grade: DofusDbMonsterGrade): AttackerProfile {
  return {
    characteristics: {
      strength: grade.strength,
      intelligence: grade.intelligence,
      chance: grade.chance,
      agility: grade.agility,
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
