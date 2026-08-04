import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDamageSpellsWithCoverage, diceRoll } from "../src/lib/spellCatalog.js";

test("diceRoll : diceSide=0 (convention DofusDB 'valeur fixe') donne un intervalle dégénéré min===max, pas un max=0", () => {
  // Cas réel : "Substitution Funèbre" du monstre Gein, diceNum=40, diceSide=0,
  // Intelligence=1200 -> dofensive.com affiche 520 (40 × (1+1200/100)).
  const roll = diceRoll({ effectId: 99, effectElement: 2, diceNum: 40, diceSide: 0, duration: 0, targetMask: "" }, 13);
  assert.deepEqual(roll, { min: 520, max: 520 });
});

test("diceRoll : un vrai intervalle (diceSide > 0) est conservé tel quel", () => {
  const roll = diceRoll({ effectId: 96, effectElement: 3, diceNum: 151, diceSide: 200, duration: 0, targetMask: "" }, 2);
  assert.deepEqual(roll, { min: 302, max: 400 });
});

const SPELLS: Record<number, { name: string; spellLevels: number[] }> = {
  1001: { name: "Frappe", spellLevels: [11001] },
  1002: { name: "Soin", spellLevels: [11002] },
};

const SPELL_LEVELS: Record<number, unknown> = {
  11001: {
    id: 11001,
    spellId: 1001,
    grade: 1,
    apCost: 3,
    minRange: 1,
    range: 1,
    criticalHitProbability: 20,
    minPlayerLevel: 1,
    maxCastPerTurn: 0,
    maxCastPerTarget: 0,
    effects: [{ effectId: 97, effectElement: 1, diceNum: 10, diceSide: 20, duration: 0, targetMask: "" }],
    criticalEffect: [],
  },
  11002: {
    // sort de soin : pas d'effet de dégâts -> doit finir dans unresolvedNames
    id: 11002,
    spellId: 1002,
    grade: 1,
    apCost: 3,
    minRange: 1,
    range: 1,
    criticalHitProbability: 0,
    minPlayerLevel: 1,
    maxCastPerTurn: 0,
    maxCastPerTarget: 0,
    effects: [],
    criticalEffect: [],
  },
};

test("resolveDamageSpellsWithCoverage sépare les sorts de dégâts des autres, en gardant leur nom", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const parsed = new URL(url);
    const id = Number(parsed.searchParams.get("id"));
    if (parsed.pathname === "/spells") {
      const spell = SPELLS[id];
      return {
        ok: true,
        json: async () => ({ total: 1, data: [{ id, name: { fr: spell.name }, description: {}, spellLevels: spell.spellLevels }] }),
      } as Response;
    }
    if (parsed.pathname === "/spell-levels") {
      return { ok: true, json: async () => ({ total: 1, data: [SPELL_LEVELS[id]] }) } as Response;
    }
    throw new Error(`URL inattendue dans le test : ${url}`);
  }) as typeof fetch;

  try {
    const coverage = await resolveDamageSpellsWithCoverage([1001, 1002], 200);
    assert.equal(coverage.resolved.length, 1);
    assert.equal(coverage.resolved[0].name, "Frappe");
    assert.deepEqual(coverage.unresolvedNames, ["Soin"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
