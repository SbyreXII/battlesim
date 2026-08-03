import { readFile } from "node:fs/promises";
import { parseStuffJson } from "../lib/dofusbookParser.js";
import { computeCharacterStats } from "../lib/characterStats.js";
import { getBreedById } from "../lib/dofusdb.js";
import { resolveDamageSpells, resolveBuffSpells } from "../lib/spellCatalog.js";
import { parseDofensiveLink } from "../lib/dofensiveParser.js";
import { planBestTurn, planOptimalFight } from "../engine/optimizer.js";
import type { TargetProfile } from "../engine/optimizer.js";
import { monsterGradeToAttackerProfile, monsterGradeToResistances } from "../lib/monsterStats.js";

const MONSTER_LINK =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

// TODO : le PA total (base + objets + monture) n'est pas encore dérivé
// automatiquement par characterStats.ts (stuffFm, base de classe). On sait
// par l'API publique dofusbook que ce stuff donne 12 PA au total — utilisé
// tel quel ici en attendant.
const AP_PER_TURN = 12;

async function main() {
  const raw = await readFile("fixtures/sample-stuff.json", "utf-8");
  const stuff = parseStuffJson(raw);
  const stats = computeCharacterStats(stuff);

  const breed = await getBreedById(stuff.character_class);
  const [damageSpells, buffSpells] = await Promise.all([
    resolveDamageSpells(breed.breedSpellsId, stuff.character_level),
    resolveBuffSpells(breed.breedSpellsId, stuff.character_level),
  ]);

  console.log(`Sorts de dégâts résolus (${damageSpells.length}/${breed.breedSpellsId.length})`);
  console.log(`Sorts de buff résolus (${buffSpells.length}) :`);
  for (const b of buffSpells) {
    console.log(`  - ${b.name} (${b.apCost} PA, +${b.powerBonus} dégâts, ${b.durationTurns} tours)`);
  }

  const { monster, grade } = await parseDofensiveLink(MONSTER_LINK);
  const monsterTarget: TargetProfile = { resistancePercent: monsterGradeToResistances(grade) };

  console.log(`\n=== Joueur attaque ${monster.name.fr} (grade ${grade.grade}, ${grade.lifePoints} PV) ===`);
  console.log(`Budget : ${AP_PER_TURN} PA/tour\n`);

  const { baseline, best, allStrategies } = planOptimalFight(
    damageSpells,
    buffSpells,
    stats,
    monsterTarget,
    AP_PER_TURN,
    grade.lifePoints,
  );

  console.log(`Sans buff : ${baseline.turnsNeeded} tours (${baseline.firstTurn.totalDamage.toFixed(0)} dégâts/tour)`);
  for (const s of allStrategies.slice(1)) {
    console.log(
      `Avec ${s.buff!.name} au tour 1 : ${s.turnsNeeded} tours ` +
        `(tour 1 : ${s.firstTurn.totalDamage.toFixed(0)} dmg, tours boostés : ${s.boostedTurn!.totalDamage.toFixed(0)} dmg/tour)`,
    );
  }

  if (best.buff) {
    console.log(`\n→ Rentable de se booster : ${best.buff.name} en premier (${best.turnsNeeded} tours au lieu de ${baseline.turnsNeeded})`);
  } else {
    console.log(`\n→ Pas rentable de se booster : attaquer directement est optimal (${baseline.turnsNeeded} tours)`);
  }

  // --- Ce que le monstre inflige au joueur ---
  console.log(`\n=== ${monster.name.fr} attaque le joueur ===`);
  const monsterSpells = await resolveDamageSpells(monster.spells, grade.level);
  console.log(`Sorts de dégâts du monstre résolus (${monsterSpells.length}/${monster.spells.length})`);

  const monsterAttacker = monsterGradeToAttackerProfile(grade);
  const playerTarget: TargetProfile = {
    resistancePercent: stats.defense.resistancePercent,
    resistanceFixed: stats.defense.resistanceFixed,
    critResistancePercent: stats.defense.critResistancePercent,
  };

  const monsterTurn = planBestTurn(monsterSpells, monsterAttacker, playerTarget, grade.actionPoints);
  console.log(`PA du monstre : ${grade.actionPoints}`);
  for (const e of monsterTurn.entries) {
    console.log(`  - ${e.casts}x ${e.name} = ${(e.casts * e.expectedDamageEach).toFixed(0)} dégâts`);
  }
  console.log(`Dégâts du monstre en espérance par tour : ${monsterTurn.totalDamage.toFixed(0)}`);
  console.log(
    `PV du joueur (vitalité seule, sans bonus de classe) : ${stats.characteristics.vitality.toFixed(0)} ` +
      `→ ${Math.ceil(stats.characteristics.vitality / Math.max(1, monsterTurn.totalDamage))} tours avant d'être tué si le monstre frappe seul à chaque tour`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
