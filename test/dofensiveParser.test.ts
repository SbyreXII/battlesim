import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDofensiveLink } from "../src/lib/dofensiveParser.js";

test("rejette un lien qui n'est pas une URL valide avec un message clair", async () => {
  await assert.rejects(() => parseDofensiveLink("pas une url"), /n'est pas une URL valide/);
});

test("rejette un lien vers un autre domaine avec un message clair", async () => {
  await assert.rejects(
    () => parseDofensiveLink("https://notdofensive.com/fr/monster/2819"),
    /ne semble pas être un lien dofensive\.com/,
  );
});

test("rejette un lien dofensive.com sans id de monstre dans le chemin", async () => {
  await assert.rejects(() => parseDofensiveLink("https://dofensive.com/fr/"), /Impossible d'extraire l'id/);
});
