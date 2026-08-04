import { readFile } from "node:fs/promises";
import { computeCharacterStats } from "../lib/characterStats.js";
import type { DofusbookStuff } from "../lib/dofusbookParser.js";

// Version condensée (effects type "E" uniquement) d'un vrai stuff Enutrof,
// récupérée via Claude in Chrome depuis une session dofusbook.net
// authentifiée. On réinjecte `type:"E"` que computeCharacterStats attend.
const raw = JSON.parse(await readFile("fixtures/real-enutrof-condensed.json", "utf-8"));

const stuff: DofusbookStuff = {
  id: 22897585,
  name: raw.name,
  character_class: raw.character_class,
  character_level: raw.character_level,
  stuffCarac: raw.stuffCarac,
  stuffItem: {},
  items: raw.items.map((it: { effects: { name: string; min: number; max: number }[] }) => ({
    effects: it.effects.map((e) => ({ ...e, type: "E" })),
  })),
  cloths: raw.cloths.map((c: { effects: { name: string; value: number }[] }) => ({
    effects: c.effects.map((e) => ({ ...e, type: "E" })),
  })),
};

const stats = computeCharacterStats(stuff);
console.log(JSON.stringify(stats, null, 2));
console.log("\n--- Comparaison avec l'écran dofusbook (stuff actif) ---");
console.log("PA calculé :", stats.actionPoints, "| affiché sur dofusbook : 12");
console.log("PM calculé :", stats.movementPoints, "| affiché sur dofusbook : 6");
console.log("Vitalité calculée :", Math.round(stats.characteristics.vitality), "| PV affiché sur dofusbook : 3250");
