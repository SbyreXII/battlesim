import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { computeCharacterStats } from "../src/lib/characterStats.js";
import { parseStuffJson } from "../src/lib/dofusbookParser.js";
import type { DofusbookStuff } from "../src/lib/dofusbookParser.js";

test("PA/PM d'un vrai stuff Enutrof correspondent à l'affichage dofusbook.net (12 PA / 6 PM)", async () => {
  const raw = JSON.parse(await readFile("fixtures/real-enutrof-condensed.json", "utf-8"));
  const stuff: DofusbookStuff = {
    id: 0,
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
    // Bonus de familier reconstruit : l'extraction condensée d'origine (via
    // Claude in Chrome, cf. README) ne conservait pas `stuffFm`, découvert
    // plus tard comme la vraie source du +1 PA/+1 PM manquant sur ce stuff
    // (confirmé sur un autre stuff réel où stuffFm.fm = {pa:1, pm:1}
    // correspondait exactement à l'écart observé ici aussi).
    stuffFm: { fm: { pa: 1, pm: 1 } },
  };

  const stats = computeCharacterStats(stuff);
  assert.equal(stats.actionPoints, 12);
  assert.equal(stats.movementPoints, 6);
});

test("le bonus de familier (stuffFm.fm) s'ajoute au PA/PM, quelle que soit sa valeur", () => {
  const stuff: DofusbookStuff = {
    id: 0,
    name: "test",
    character_class: 1,
    character_level: 200,
    stuffCarac: {},
    stuffItem: {},
    items: [],
    cloths: [],
    stuffFm: { fm: { pa: 2, pm: 0 } },
  };
  const stats = computeCharacterStats(stuff);
  assert.equal(stats.actionPoints, 8); // 6 (base) + 2 (familier)
  assert.equal(stats.movementPoints, 3); // 3 (base) + 0 (familier)
});

test("PA/PM sans familier configuré retombent sur la base stricte (6 PA / 3 PM)", () => {
  const stuff: DofusbookStuff = {
    id: 0,
    name: "test",
    character_class: 1,
    character_level: 200,
    stuffCarac: {},
    stuffItem: {},
    items: [],
    cloths: [],
  };
  const stats = computeCharacterStats(stuff);
  assert.equal(stats.actionPoints, 6);
  assert.equal(stats.movementPoints, 3);
});

test("le stuff d'exemple (fixture Iop) se parse sans erreur et donne des stats positives", async () => {
  const raw = await readFile("fixtures/sample-stuff.json", "utf-8");
  const stuff = parseStuffJson(raw);
  const stats = computeCharacterStats(stuff);
  assert.ok(stats.characteristics.intelligence > 0, "un stuff Feu doit avoir de l'Intelligence");
  assert.ok(stats.actionPoints > 0);
});

test("le code d'effet 'dmg' (Dommages génériques) est compté comme Puissance", async () => {
  const stuff: DofusbookStuff = {
    id: 0,
    name: "test",
    character_class: 1,
    character_level: 200,
    stuffCarac: {},
    stuffItem: {},
    items: [{ effects: [{ name: "dmg", type: "E", min: 10, max: 20 }] }],
    cloths: [],
  };
  const stats = computeCharacterStats(stuff);
  assert.equal(stats.combat.power, 15); // moyenne (10+20)/2
});
