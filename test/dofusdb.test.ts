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
