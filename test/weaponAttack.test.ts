import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseStuffJson } from "../src/lib/dofusbookParser.js";
import { resolveWeaponAttack } from "../src/lib/weaponAttack.js";

test("l'arme équipée (Arc corrompu) du stuff d'exemple est résolue en option de dégâts", async () => {
  const raw = await readFile("fixtures/sample-stuff.json", "utf-8");
  const stuff = parseStuffJson(raw);
  const weapon = resolveWeaponAttack(stuff);

  assert.ok(weapon, "une arme avec un effet 'df' doit être résolue");
  assert.equal(weapon!.apCost, 5); // pa_cost de l'Arc corrompu dans la fixture
  assert.equal(weapon!.element, "neutral");
  assert.deepEqual(weapon!.normalDamage, { min: 41, max: 55 }); // effet "df" 41-55, hits_count=1
});

test("pas d'arme sans effet de dégâts -> resolveWeaponAttack renvoie null", () => {
  const stuff = {
    id: 0,
    name: "test",
    character_class: 1,
    character_level: 1,
    stuffCarac: {},
    stuffItem: {},
    items: [{ effects: [], weapon: null }],
  } as never;
  assert.equal(resolveWeaponAttack(stuff), null);
});
