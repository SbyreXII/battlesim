import { test } from "node:test";
import assert from "node:assert/strict";
import { getSpellById } from "../src/lib/dofusdb.js";

test("getSpellById met en cache : un id déjà résolu ne redéclenche pas de requête réseau", async () => {
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCount++;
    return {
      ok: true,
      json: async () => ({
        total: 1,
        data: [{ id: 999999, name: { fr: "Sort de test" }, description: {}, spellLevels: [] }],
      }),
    } as Response;
  }) as typeof fetch;

  try {
    const first = await getSpellById(999999);
    const second = await getSpellById(999999);
    assert.equal(fetchCount, 1, "une seule requête réseau doit avoir été faite pour le même id");
    assert.equal(first, second, "les deux appels doivent renvoyer la même référence (issue du cache)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpellById réessaie après une erreur serveur transitoire (5xx) puis réussit", async () => {
  let attempt = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    attempt++;
    if (attempt < 3) {
      return { ok: false, status: 503, json: async () => ({}) } as Response;
    }
    return {
      ok: true,
      json: async () => ({
        total: 1,
        data: [{ id: 888888, name: { fr: "Sort retenté" }, description: {}, spellLevels: [] }],
      }),
    } as Response;
  }) as typeof fetch;

  try {
    const spell = await getSpellById(888888);
    assert.equal(attempt, 3, "doit avoir réessayé 2 fois avant de réussir au 3e essai");
    assert.equal(spell.name.fr, "Sort retenté");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpellById n'insiste pas sur une erreur 4xx (id invalide)", async () => {
  let attempt = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    attempt++;
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }) as typeof fetch;

  try {
    await assert.rejects(() => getSpellById(777777));
    assert.equal(attempt, 1, "une erreur 4xx ne doit pas déclencher de retry");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
