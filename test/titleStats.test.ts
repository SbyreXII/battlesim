import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStatsFromTitle } from "../src/lib/titleStats.js";

test("extrait PA/PM d'un titre au format standard", () => {
  const hint = parseStatsFromTitle("Feu LvL 200 - 12 PA / 5 PM - Iop Cape High");
  assert.deepEqual(hint, { pa: 12, pm: 5 });
});

test("insensible à la casse et aux espaces", () => {
  const hint = parseStatsFromTitle("mon stuff 13pa/6pm build crit");
  assert.deepEqual(hint, { pa: 13, pm: 6 });
});

test("renvoie null si le titre ne contient pas ce motif", () => {
  const hint = parseStatsFromTitle("Enutrof M 200");
  assert.deepEqual(hint, { pa: null, pm: null });
});
