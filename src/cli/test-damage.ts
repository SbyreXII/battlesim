import { readFile } from "node:fs/promises";
import { parseStuffJson } from "../lib/dofusbookParser.js";
import { computeCharacterStats } from "../lib/characterStats.js";
import { getBestSpellLevel } from "../lib/dofusdb.js";
import { parseDofensiveLink } from "../lib/dofensiveParser.js";
import { computeSpellDamage, ELEMENT_ID_MAP } from "../engine/damage.js";

const COUPERET_SPELL_ID = 13115;
const MONSTER_LINK =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

async function main() {
  const raw = await readFile("fixtures/sample-stuff.json", "utf-8");
  const stuff = parseStuffJson(raw);
  const stats = computeCharacterStats(stuff);
  console.log("Stats agrégées du personnage :");
  console.log(JSON.stringify(stats, null, 2));

  const spellLevel = await getBestSpellLevel(COUPERET_SPELL_ID, stuff.character_level);
  const normalEffect = spellLevel.effects.find((e) => e.effectElement >= 0);
  const criticalEffect = spellLevel.criticalEffect.find((e) => e.effectElement >= 0);
  if (!normalEffect || !criticalEffect) {
    throw new Error("Effet de dégâts introuvable sur ce spell-level");
  }
  const element = ELEMENT_ID_MAP[normalEffect.effectElement];
  console.log(
    `\nCouperet grade ${spellLevel.grade} (PA: ${spellLevel.apCost}, portée: ${spellLevel.range}) :`,
  );
  console.log(
    `  dégâts ${element} normaux ${normalEffect.diceNum}-${normalEffect.diceSide}, ` +
      `critiques ${criticalEffect.diceNum}-${criticalEffect.diceSide}, ` +
      `1 chance sur ${spellLevel.criticalHitProbability} d'être critique`,
  );

  const { monster, grade } = await parseDofensiveLink(MONSTER_LINK);
  console.log(`\nCible : ${monster.name.fr} grade ${grade.grade} (${grade.lifePoints} PV)`);

  const resistanceByElement: Record<string, number> = {
    neutral: grade.neutralResistance,
    earth: grade.earthResistance,
    fire: grade.fireResistance,
    water: grade.waterResistance,
    air: grade.airResistance,
  };

  const baseCritPercent = 100 / spellLevel.criticalHitProbability;
  const totalCritPercent = baseCritPercent + stats.combat.critChancePercent;

  const result = computeSpellDamage({
    element,
    normalDamage: { min: normalEffect.diceNum, max: normalEffect.diceSide },
    criticalDamage: { min: criticalEffect.diceNum, max: criticalEffect.diceSide },
    critChancePercent: totalCritPercent,
    caster: stats,
    targetResistancePercent: resistanceByElement[element],
  });

  console.log(`\nRésistance ${element} de la cible : ${resistanceByElement[element]}%`);
  console.log(`Chance de critique : ${totalCritPercent.toFixed(1)}%`);
  console.log(`Dégâts normaux moyens : ${result.averageNormalHit}`);
  console.log(`Dégâts critiques moyens : ${result.averageCriticalHit}`);
  console.log(`Dégâts en espérance : ${result.expectedDamage.toFixed(1)}`);
  console.log(
    `Tours nécessaires pour tuer (1 Couperet/tour) : ${Math.ceil(grade.lifePoints / result.expectedDamage)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
