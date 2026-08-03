import { readFile } from "node:fs/promises";
import { runSimulation } from "../lib/simulate.js";

const stuffJson = await readFile("fixtures/sample-stuff.json", "utf-8");
const monsterLink =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

const result = await runSimulation({ stuffJson, monsterLink });

console.log("Dégâts du monstre (1er tour) :", JSON.stringify(result.monsterAttack.turn, null, 2));
console.log("\nCourse :", JSON.stringify(result.race, null, 2));
