var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/lz-string/libs/lz-string.js
var require_lz_string = __commonJS({
  "node_modules/lz-string/libs/lz-string.js"(exports, module) {
    var LZString = (function() {
      var f = String.fromCharCode;
      var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
      var baseReverseDic = {};
      function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
          baseReverseDic[alphabet] = {};
          for (var i = 0; i < alphabet.length; i++) {
            baseReverseDic[alphabet][alphabet.charAt(i)] = i;
          }
        }
        return baseReverseDic[alphabet][character];
      }
      var LZString2 = {
        compressToBase64: function(input) {
          if (input == null) return "";
          var res = LZString2._compress(input, 6, function(a) {
            return keyStrBase64.charAt(a);
          });
          switch (res.length % 4) {
            // To produce valid Base64
            default:
            // When could this happen ?
            case 0:
              return res;
            case 1:
              return res + "===";
            case 2:
              return res + "==";
            case 3:
              return res + "=";
          }
        },
        decompressFromBase64: function(input) {
          if (input == null) return "";
          if (input == "") return null;
          return LZString2._decompress(input.length, 32, function(index) {
            return getBaseValue(keyStrBase64, input.charAt(index));
          });
        },
        compressToUTF16: function(input) {
          if (input == null) return "";
          return LZString2._compress(input, 15, function(a) {
            return f(a + 32);
          }) + " ";
        },
        decompressFromUTF16: function(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString2._decompress(compressed.length, 16384, function(index) {
            return compressed.charCodeAt(index) - 32;
          });
        },
        //compress into uint8array (UCS-2 big endian format)
        compressToUint8Array: function(uncompressed) {
          var compressed = LZString2.compress(uncompressed);
          var buf = new Uint8Array(compressed.length * 2);
          for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
            var current_value = compressed.charCodeAt(i);
            buf[i * 2] = current_value >>> 8;
            buf[i * 2 + 1] = current_value % 256;
          }
          return buf;
        },
        //decompress from uint8array (UCS-2 big endian format)
        decompressFromUint8Array: function(compressed) {
          if (compressed === null || compressed === void 0) {
            return LZString2.decompress(compressed);
          } else {
            var buf = new Array(compressed.length / 2);
            for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
              buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
            }
            var result = [];
            buf.forEach(function(c) {
              result.push(f(c));
            });
            return LZString2.decompress(result.join(""));
          }
        },
        //compress into a string that is already URI encoded
        compressToEncodedURIComponent: function(input) {
          if (input == null) return "";
          return LZString2._compress(input, 6, function(a) {
            return keyStrUriSafe.charAt(a);
          });
        },
        //decompress from an output of compressToEncodedURIComponent
        decompressFromEncodedURIComponent: function(input) {
          if (input == null) return "";
          if (input == "") return null;
          input = input.replace(/ /g, "+");
          return LZString2._decompress(input.length, 32, function(index) {
            return getBaseValue(keyStrUriSafe, input.charAt(index));
          });
        },
        compress: function(uncompressed) {
          return LZString2._compress(uncompressed, 16, function(a) {
            return f(a);
          });
        },
        _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
          if (uncompressed == null) return "";
          var i, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
          for (ii = 0; ii < uncompressed.length; ii += 1) {
            context_c = uncompressed.charAt(ii);
            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
              context_dictionary[context_c] = context_dictSize++;
              context_dictionaryToCreate[context_c] = true;
            }
            context_wc = context_w + context_c;
            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
              context_w = context_wc;
            } else {
              if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 8; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                } else {
                  value = 1;
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1 | value;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = 0;
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 16; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                  context_enlargeIn = Math.pow(2, context_numBits);
                  context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
              } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              context_dictionary[context_wc] = context_dictSize++;
              context_w = String(context_c);
            }
          }
          if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
              if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i = 0; i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
          }
          value = 2;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1 | value & 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
          while (true) {
            context_data_val = context_data_val << 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data.push(getCharFromInt(context_data_val));
              break;
            } else context_data_position++;
          }
          return context_data.join("");
        },
        decompress: function(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString2._decompress(compressed.length, 32768, function(index) {
            return compressed.charCodeAt(index);
          });
        },
        _decompress: function(length, resetValue, getNextValue) {
          var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
          for (i = 0; i < 3; i += 1) {
            dictionary[i] = i;
          }
          bits = 0;
          maxpower = Math.pow(2, 2);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          switch (next = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2, 8);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2, 16);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 2:
              return "";
          }
          dictionary[3] = c;
          w = c;
          result.push(c);
          while (true) {
            if (data.index > length) {
              return "";
            }
            bits = 0;
            maxpower = Math.pow(2, numBits);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            switch (c = bits) {
              case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 2:
                return result.join("");
            }
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
            if (dictionary[c]) {
              entry = dictionary[c];
            } else {
              if (c === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }
            result.push(entry);
            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            w = entry;
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
          }
        }
      };
      return LZString2;
    })();
    if (typeof define === "function" && define.amd) {
      define(function() {
        return LZString;
      });
    } else if (typeof module !== "undefined" && module != null) {
      module.exports = LZString;
    } else if (typeof angular !== "undefined" && angular != null) {
      angular.module("LZString", []).factory("LZString", function() {
        return LZString;
      });
    }
  }
});

// src/lib/dofusbookParser.ts
function normalize(raw) {
  const body = raw;
  const stuff = "stuff" in body ? {
    ...body.stuff,
    items: body.items ?? body.stuff.items,
    cloths: body.cloths ?? body.stuff.cloths
  } : body;
  if (!stuff || typeof stuff.id !== "number" || !stuff.stuffItem) {
    throw new Error("JSON de stuff invalide : champs attendus (id, stuffItem) absents.");
  }
  return stuff;
}
function parseStuffJson(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Le contenu fourni n'est pas du JSON valide.");
  }
  return normalize(parsed);
}

// src/lib/characterStats.ts
var CHARACTERISTIC_CODES = {
  vi: "vitality",
  fo: "strength",
  in: "intelligence",
  ch: "chance",
  ag: "agility",
  sa: "wisdom"
};
var ELEMENTAL_FIXED_DAMAGE_CODES = {
  dnf: "neutral",
  dtf: "earth",
  dff: "fire",
  def: "water",
  daf: "air"
};
var COMBAT_CODES = {
  cc: "critChancePercent",
  dc: "critDamageBonus",
  pu: "power",
  // "dmg" = Dommages générique (toutes éléments), trouvé sur un stuff Enutrof
  // réel et jusque-là non décodé (finissait dans `raw`, jamais compté dans
  // les dégâts). Traité comme équivalent à Puissance dans notre modèle
  // additif simplifié (les deux ajoutent un bonus plat toutes éléments).
  dmg: "power",
  pa: "apBonus",
  pm: "mpBonus"
};
var RESISTANCE_PERCENT_CODES = {
  rnp: "neutral",
  rtp: "earth",
  rfp: "fire",
  rep: "water",
  rap: "air"
};
var RESISTANCE_FIXED_CODES = {
  rn: "neutral",
  rt: "earth",
  rf: "fire",
  re: "water",
  ra: "air"
};
var MOBILITY_CODES = {
  ta: "tacklePercent",
  fu: "fuitePercent"
};
var BASE_ACTION_POINTS = 7;
var BASE_MOVEMENT_POINTS = 4;
function emptyStats() {
  return {
    characteristics: { vitality: 0, strength: 0, intelligence: 0, chance: 0, agility: 0, wisdom: 0 },
    elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
    combat: { critChancePercent: 0, critDamageBonus: 0, power: 0, apBonus: 0, mpBonus: 0 },
    defense: {
      resistancePercent: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
      resistanceFixed: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
      critResistancePercent: 0
    },
    mobility: { tacklePercent: 0, fuitePercent: 0 },
    actionPoints: BASE_ACTION_POINTS,
    movementPoints: BASE_MOVEMENT_POINTS,
    raw: {}
  };
}
function addEffect(stats, code, amount) {
  if (code in CHARACTERISTIC_CODES) {
    const key = CHARACTERISTIC_CODES[code];
    stats.characteristics[key] += amount;
  } else if (code in ELEMENTAL_FIXED_DAMAGE_CODES) {
    const key = ELEMENTAL_FIXED_DAMAGE_CODES[code];
    stats.elementalFixedDamage[key] += amount;
  } else if (code in COMBAT_CODES) {
    const key = COMBAT_CODES[code];
    stats.combat[key] += amount;
  } else if (code in RESISTANCE_PERCENT_CODES) {
    const key = RESISTANCE_PERCENT_CODES[code];
    stats.defense.resistancePercent[key] += amount;
  } else if (code in RESISTANCE_FIXED_CODES) {
    const key = RESISTANCE_FIXED_CODES[code];
    stats.defense.resistanceFixed[key] += amount;
  } else if (code === "rc") {
    stats.defense.critResistancePercent += amount;
  } else if (code in MOBILITY_CODES) {
    const key = MOBILITY_CODES[code];
    stats.mobility[key] += amount;
  } else {
    stats.raw[code] = (stats.raw[code] ?? 0) + amount;
  }
}
function computeCharacterStats(stuff) {
  const stats = emptyStats();
  for (const item of stuff.items) {
    for (const effect of item.effects ?? []) {
      if (effect.type !== "E") continue;
      addEffect(stats, effect.name, (effect.min + effect.max) / 2);
    }
  }
  for (const cloth of stuff.cloths ?? []) {
    for (const effect of cloth.effects ?? []) {
      if (effect.type !== "E") continue;
      addEffect(stats, effect.name, effect.value);
    }
  }
  const carac = stuff.stuffCarac ?? {};
  stats.characteristics.vitality += carac.base_vi ?? 0;
  stats.characteristics.strength += carac.base_fo ?? 0;
  stats.characteristics.intelligence += carac.base_in ?? 0;
  stats.characteristics.chance += carac.base_ch ?? 0;
  stats.characteristics.agility += carac.base_ag ?? 0;
  stats.characteristics.wisdom += carac.base_sa ?? 0;
  stats.actionPoints = BASE_ACTION_POINTS + stats.combat.apBonus;
  stats.movementPoints = BASE_MOVEMENT_POINTS + stats.combat.mpBonus;
  return stats;
}

// src/lib/dofusdb.ts
var DOFUSDB_BASE = "https://api.dofusdb.fr";
var REQUEST_TIMEOUT_MS = 1e4;
var MAX_ATTEMPTS = 3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function dofusDbGet(path) {
  let lastError = new Error(`DofusDB request failed: ${path}`);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let clientError = false;
    try {
      const res = await fetch(`${DOFUSDB_BASE}${path}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (res.ok) return await res.json();
      lastError = new Error(`DofusDB request failed (${res.status}): ${path}`);
      clientError = res.status < 500;
    } catch (err) {
      lastError = err instanceof Error && err.name === "AbortError" ? new Error(`DofusDB n'a pas r\xE9pondu \xE0 temps (${path})`) : err;
    } finally {
      clearTimeout(timeout);
    }
    if (clientError) throw lastError;
    if (attempt < MAX_ATTEMPTS) await sleep(300 * attempt);
  }
  throw new Error(
    `DofusDB est indisponible apr\xE8s ${MAX_ATTEMPTS} tentatives (${path}) : ${lastError.message}`
  );
}
function withCache(fn, keyOf) {
  const cache = /* @__PURE__ */ new Map();
  return (...args) => {
    const key = keyOf(...args);
    const cached = cache.get(key);
    if (cached) return cached;
    const promise = fn(...args).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, promise);
    return promise;
  };
}
var getMonsterById = withCache(async (id) => {
  const result = await dofusDbGet(
    `/monsters?id=${id}`
  );
  const monster = result.data[0];
  if (!monster) throw new Error(`Monstre DofusDB introuvable pour l'id ${id}`);
  return monster;
}, String);
var getSpellById = withCache(async (id) => {
  const result = await dofusDbGet(
    `/spells?id=${id}`
  );
  const spell = result.data[0];
  if (!spell) throw new Error(`Sort DofusDB introuvable pour l'id ${id}`);
  return spell;
}, String);
var getSpellLevelById = withCache(async (id) => {
  const result = await dofusDbGet(
    `/spell-levels?id=${id}`
  );
  const level = result.data[0];
  if (!level) throw new Error(`SpellLevel DofusDB introuvable pour l'id ${id}`);
  return level;
}, String);
var getBreedById = withCache(async (id) => {
  const result = await dofusDbGet(
    `/breeds?id=${id}`
  );
  const breed = result.data[0];
  if (!breed) throw new Error(`Classe DofusDB introuvable pour l'id ${id}`);
  return breed;
}, String);
async function getBestSpellLevel(spellId, characterLevel) {
  const spell = await getSpellById(spellId);
  const levels = await Promise.all(spell.spellLevels.map(getSpellLevelById));
  const eligible = levels.filter((l) => l.minPlayerLevel <= characterLevel).sort((a, b) => b.grade - a.grade);
  const best = eligible[0];
  if (!best) {
    throw new Error(
      `Aucun niveau du sort ${spellId} n'est accessible au niveau ${characterLevel}`
    );
  }
  return best;
}
async function getSpellLevelForGrade(spellId, desiredGrade) {
  const spell = await getSpellById(spellId);
  const levels = await Promise.all(spell.spellLevels.map(getSpellLevelById));
  const match = levels.find((l) => l.grade === desiredGrade);
  if (match) return match;
  const sorted = levels.sort((a, b) => a.grade - b.grade);
  if (!sorted[0]) {
    throw new Error(`Aucun niveau trouv\xE9 pour le sort ${spellId}`);
  }
  return sorted[0];
}

// src/engine/damage.ts
var ELEMENT_ID_MAP = {
  0: "neutral",
  1: "earth",
  2: "fire",
  3: "water",
  4: "air"
};
var ELEMENT_CHARACTERISTIC = {
  earth: "strength",
  fire: "intelligence",
  water: "chance",
  air: "agility"
};
function average(roll) {
  return (roll.min + roll.max) / 2;
}
function computeSpellDamage(input) {
  const { element, caster, targetResistancePercent, targetResistanceFixed = 0 } = input;
  const characteristicKey = ELEMENT_CHARACTERISTIC[element];
  const characteristicBonus = characteristicKey ? caster.characteristics[characteristicKey] : 0;
  const fixedElementalBonus = caster.elementalFixedDamage[element];
  const powerBonus = caster.combat.power;
  const flatBonus = characteristicBonus + fixedElementalBonus + powerBonus;
  const normalHit = applyResistance(
    average(input.normalDamage) + flatBonus,
    targetResistancePercent,
    targetResistanceFixed
  );
  const criticalHit = applyResistance(
    average(input.criticalDamage) + flatBonus + caster.combat.critDamageBonus,
    targetResistancePercent,
    targetResistanceFixed
  );
  const critChance = Math.max(0, Math.min(100, input.critChancePercent)) / 100;
  const expectedDamage = normalHit * (1 - critChance) + criticalHit * critChance;
  return { averageNormalHit: normalHit, averageCriticalHit: criticalHit, expectedDamage };
}
function applyResistance(damage, resistancePercent, resistanceFixed) {
  const afterPercent = damage * (1 - resistancePercent / 100);
  const afterFixed = afterPercent - resistanceFixed;
  return Math.max(0, Math.round(afterFixed));
}

// src/lib/spellCatalog.ts
var DAMAGE_EFFECT_IDS = /* @__PURE__ */ new Set([96, 97, 98, 99, 100]);
function findDamageEffect(effects) {
  return effects.find((e) => DAMAGE_EFFECT_IDS.has(e.effectId) && e.effectElement >= 0);
}
function diceRoll(effect, multiplier = 1) {
  const fixed = effect.diceSide === 0;
  return {
    min: effect.diceNum * multiplier,
    max: (fixed ? effect.diceNum : effect.diceSide) * multiplier
  };
}
async function resolveDamageSpell(spellId, characterLevel) {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getBestSpellLevel(spellId, characterLevel)
  ]);
  const normalEffect = findDamageEffect(spellLevel.effects);
  if (!normalEffect) return null;
  const criticalEffect = findDamageEffect(spellLevel.criticalEffect) ?? normalEffect;
  return {
    spellId,
    name: spell.name.fr,
    grade: spellLevel.grade,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    maxCastPerTarget: spellLevel.maxCastPerTarget,
    range: spellLevel.range,
    element: ELEMENT_ID_MAP[normalEffect.effectElement],
    normalDamage: diceRoll(normalEffect),
    criticalDamage: diceRoll(criticalEffect),
    criticalHitProbability: spellLevel.criticalHitProbability
  };
}
async function resolveDamageSpellsWithCoverage(spellIds, characterLevel) {
  const pairs = await Promise.all(
    spellIds.map(async (id) => {
      const [option, spell] = await Promise.all([resolveDamageSpell(id, characterLevel), getSpellById(id)]);
      return { option, name: spell.name.fr };
    })
  );
  return {
    resolved: pairs.filter((p) => p.option !== null).map((p) => p.option),
    unresolvedNames: pairs.filter((p) => p.option === null).map((p) => p.name)
  };
}
function monsterDamageMultiplier(element, grade) {
  const key = ELEMENT_CHARACTERISTIC[element];
  if (!key) return 1;
  const characteristicValue = { strength: grade.strength, intelligence: grade.intelligence, chance: grade.chance, agility: grade.agility }[key];
  return 1 + characteristicValue / 100;
}
function parseSpellGradeForMonsterGrade(spellGradesEntry, monsterGrade) {
  const pairs = spellGradesEntry.split(";").map((p) => Number(p.split(",")[0]));
  return pairs[monsterGrade - 1] ?? pairs[pairs.length - 1] ?? 1;
}
async function resolveMonsterDamageSpell(spellId, spellGrade, monsterGrade) {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getSpellLevelForGrade(spellId, spellGrade)
  ]);
  const normalEffect = findDamageEffect(spellLevel.effects);
  if (!normalEffect) return null;
  const criticalEffect = findDamageEffect(spellLevel.criticalEffect) ?? normalEffect;
  const element = ELEMENT_ID_MAP[normalEffect.effectElement];
  const multiplier = monsterDamageMultiplier(element, monsterGrade);
  return {
    spellId,
    name: spell.name.fr,
    grade: spellLevel.grade,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    maxCastPerTarget: spellLevel.maxCastPerTarget,
    range: spellLevel.range,
    element,
    normalDamage: diceRoll(normalEffect, multiplier),
    criticalDamage: diceRoll(criticalEffect, multiplier),
    criticalHitProbability: spellLevel.criticalHitProbability
  };
}
async function resolveMonsterDamageSpells(monster, grade) {
  const resolved = await Promise.all(
    monster.spells.map((spellId, i) => {
      const spellGrade = parseSpellGradeForMonsterGrade(monster.spellGrades[i] ?? "1,0", grade.grade);
      return resolveMonsterDamageSpell(spellId, spellGrade, grade);
    })
  );
  return resolved.filter((s) => s !== null);
}
var SELF_DAMAGE_BUFF_EFFECT_IDS = /* @__PURE__ */ new Set([138, 112]);
async function resolveBuffSpell(spellId, characterLevel) {
  const [spell, spellLevel] = await Promise.all([
    getSpellById(spellId),
    getBestSpellLevel(spellId, characterLevel)
  ]);
  const buffEffects = spellLevel.effects.filter((e) => SELF_DAMAGE_BUFF_EFFECT_IDS.has(e.effectId));
  if (buffEffects.length === 0) return null;
  const powerBonus = buffEffects.reduce((sum, e) => sum + e.diceNum, 0);
  const durationTurns = Math.max(...buffEffects.map((e) => e.duration), 1);
  return {
    spellId,
    name: spell.name.fr,
    apCost: spellLevel.apCost,
    maxCastPerTurn: spellLevel.maxCastPerTurn,
    durationTurns,
    powerBonus
  };
}
async function resolveBuffSpells(spellIds, characterLevel) {
  const resolved = await Promise.all(spellIds.map((id) => resolveBuffSpell(id, characterLevel)));
  return resolved.filter((s) => s !== null);
}

// src/lib/weaponAttack.ts
var WEAPON_ATTACK_SPELL_ID = -1;
function resolveWeaponAttack(stuff) {
  const items = stuff.items ?? [];
  const weaponItem = items.find((it) => it.weapon != null);
  if (!weaponItem?.weapon) return null;
  const damageEffect = weaponItem.effects?.find((e) => e.type === "D" && e.name === "df");
  if (!damageEffect) return null;
  const { pa_cost, hits_count, cc_hits } = weaponItem.weapon;
  const hits = hits_count > 0 ? hits_count : 1;
  return {
    spellId: WEAPON_ATTACK_SPELL_ID,
    name: "Attaque \xE0 l'arme",
    grade: 1,
    apCost: pa_cost,
    maxCastPerTurn: 0,
    // limité par le budget de PA uniquement, comme en jeu
    maxCastPerTarget: 0,
    range: 1,
    element: "neutral",
    normalDamage: { min: damageEffect.min * hits, max: damageEffect.max * hits },
    criticalDamage: { min: damageEffect.min * hits, max: damageEffect.max * hits },
    criticalHitProbability: cc_hits > 0 ? cc_hits : 1e6
  };
}

// src/lib/kiteAnalysis.ts
function assessKiteFeasibility(playerSpells, playerMovementPoints, monsterMovementPoints) {
  const hasRangedOption = playerSpells.some((s) => s.range > 1);
  if (!hasRangedOption) {
    return { possible: false, reason: "Aucun sort \xE0 port\xE9e > 1 disponible \u2014 oblig\xE9 de rester au contact." };
  }
  if (playerMovementPoints < monsterMovementPoints) {
    return {
      possible: false,
      reason: `PM insuffisants pour maintenir la distance (${playerMovementPoints} contre ${monsterMovementPoints} au monstre).`
    };
  }
  return { possible: true, reason: "Sort(s) \xE0 distance disponibles et PM au moins \xE9gaux au monstre." };
}
function splitMonsterSpellsByRange(monsterSpells) {
  return {
    melee: monsterSpells.filter((s) => s.range <= 1),
    ranged: monsterSpells.filter((s) => s.range > 1)
  };
}

// src/lib/titleStats.ts
var TITLE_PATTERN = /(\d+)\s*PA\s*\/\s*(\d+)\s*PM/i;
function parseStatsFromTitle(name) {
  const match = name.match(TITLE_PATTERN);
  if (!match) return { pa: null, pm: null };
  return { pa: Number(match[1]), pm: Number(match[2]) };
}

// src/lib/dofensiveParser.ts
var import_lz_string = __toESM(require_lz_string(), 1);
var { decompressFromEncodedURIComponent } = import_lz_string.default;
function extractMonsterId(url) {
  const match = url.pathname.match(/\/monster\/(\d+)/);
  if (!match) {
    throw new Error(`Impossible d'extraire l'id du monstre depuis ${url.pathname}`);
  }
  return Number(match[1]);
}
function decodeState(url) {
  const q = url.searchParams.get("q");
  if (!q) return null;
  const json = decompressFromEncodedURIComponent(q);
  if (!json) throw new Error("Impossible de d\xE9compresser le param\xE8tre q= de dofensive.com");
  return JSON.parse(json);
}
async function parseDofensiveLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error(
      `"${link}" n'est pas une URL valide. Colle un lien complet du type https://dofensive.com/fr/monster/2819?q=...`
    );
  }
  if (url.hostname.toLowerCase() !== "dofensive.com" && !url.hostname.toLowerCase().endsWith(".dofensive.com")) {
    throw new Error(`"${link}" ne semble pas \xEAtre un lien dofensive.com.`);
  }
  const monsterIdFromPath = extractMonsterId(url);
  const state = decodeState(url);
  const monsterId = state?.SelectedMonster ?? monsterIdFromPath;
  const monster = await getMonsterById(monsterId);
  const gradeNumber = state?.Monsters?.[String(monsterId)]?.Grade ?? 1;
  const grade = monster.grades.find((g) => g.grade === gradeNumber);
  if (!grade) {
    throw new Error(`Grade ${gradeNumber} introuvable pour le monstre ${monsterId}`);
  }
  return {
    monster,
    grade,
    state: state ?? { SelectedMonster: monsterId, Monsters: {} }
  };
}

// src/engine/optimizer.ts
var ZERO_RESISTANCE = { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 };
function planBestTurn(spells, caster, target, apBudget, remainingCasts) {
  const critChanceMalus = target.critResistancePercent ?? 0;
  const items = spells.filter((s) => s.apCost > 0 && s.apCost <= apBudget).filter((s) => (remainingCasts?.get(s.spellId) ?? Infinity) > 0).map((spell) => {
    const baseCritPercent = 100 / spell.criticalHitProbability;
    const totalCritPercent = baseCritPercent + caster.combat.critChancePercent - critChanceMalus;
    const { expectedDamage } = computeSpellDamage({
      element: spell.element,
      normalDamage: spell.normalDamage,
      criticalDamage: spell.criticalDamage,
      critChancePercent: totalCritPercent,
      caster,
      targetResistancePercent: target.resistancePercent[spell.element],
      targetResistanceFixed: (target.resistanceFixed ?? ZERO_RESISTANCE)[spell.element]
    });
    return { spell, expectedDamage };
  });
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(apBudget + 1).fill(0));
  const castsAt = Array.from({ length: n + 1 }, () => new Array(apBudget + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const { spell, expectedDamage } = items[i - 1];
    const perTurnMax = spell.maxCastPerTurn > 0 ? spell.maxCastPerTurn : Infinity;
    const perTargetMax = remainingCasts?.get(spell.spellId) ?? Infinity;
    const hardMax = Math.min(perTurnMax, perTargetMax);
    for (let ap2 = 0; ap2 <= apBudget; ap2++) {
      let best = dp[i - 1][ap2];
      let bestCasts = 0;
      const maxByAp = Math.floor(ap2 / spell.apCost);
      const maxCasts = Math.min(hardMax, maxByAp);
      for (let casts = 1; casts <= maxCasts; casts++) {
        const value = dp[i - 1][ap2 - casts * spell.apCost] + casts * expectedDamage;
        if (value > best) {
          best = value;
          bestCasts = casts;
        }
      }
      dp[i][ap2] = best;
      castsAt[i][ap2] = bestCasts;
    }
  }
  const entries = [];
  let ap = apBudget;
  for (let i = n; i >= 1; i--) {
    const casts = castsAt[i][ap];
    if (casts > 0) {
      const { spell, expectedDamage } = items[i - 1];
      entries.push({
        spellId: spell.spellId,
        name: spell.name,
        casts,
        apCostEach: spell.apCost,
        expectedDamageEach: expectedDamage
      });
      ap -= casts * spell.apCost;
    }
  }
  const totalApUsed = apBudget - ap;
  return { entries, totalApUsed, totalDamage: dp[n][apBudget] };
}
var MAX_SIMULATED_TURNS = 500;
function initialRemainingCasts(spells) {
  return new Map(spells.map((s) => [s.spellId, s.maxCastPerTarget > 0 ? s.maxCastPerTarget : Infinity]));
}
function simulateFight(spells, target, targetLifePoints, casterForTurn) {
  const remaining = initialRemainingCasts(spells);
  let hp = targetLifePoints;
  let totalDamage = 0;
  const turns = [];
  let turnIndex = 0;
  while (hp > 0) {
    turnIndex++;
    if (turnIndex > MAX_SIMULATED_TURNS) {
      throw new Error(
        `Impossible de tuer la cible avec les sorts disponibles au-del\xE0 de ${MAX_SIMULATED_TURNS} tours \u2014 probablement parce que les sorts de d\xE9g\xE2ts ont atteint leur nombre maximum de lancers sur cette cible.`
      );
    }
    const { caster, apBudget } = casterForTurn(turnIndex);
    const turn = planBestTurn(spells, caster, target, apBudget, remaining);
    if (turn.totalDamage <= 0) {
      throw new Error(
        "Aucun sort de d\xE9g\xE2ts n'est jouable (PA insuffisants, ou tous les sorts ont atteint leur limite de lancers sur cette cible)."
      );
    }
    for (const entry of turn.entries) {
      remaining.set(entry.spellId, (remaining.get(entry.spellId) ?? Infinity) - entry.casts);
    }
    hp -= turn.totalDamage;
    totalDamage += turn.totalDamage;
    turns.push(turn);
  }
  return { turns, turnsNeeded: turnIndex, totalDamage };
}
function planFight(spells, caster, target, apPerTurn, targetLifePoints) {
  const { turns, turnsNeeded, totalDamage } = simulateFight(spells, target, targetLifePoints, () => ({
    caster,
    apBudget: apPerTurn
  }));
  return { turn: turns[0], turnsNeeded, totalDamageDealt: totalDamage };
}
function applyBuffs(caster, buffs) {
  const totalPowerBonus = buffs.reduce((sum, b) => sum + b.powerBonus, 0);
  return { ...caster, combat: { ...caster.combat, power: caster.combat.power + totalPowerBonus } };
}
function casterScheduleFor(caster, buffs, apPerTurn) {
  if (buffs.length === 0) return () => ({ caster, apBudget: apPerTurn });
  const totalApCost = buffs.reduce((sum, b) => sum + b.apCost, 0);
  const durationTurns = Math.min(...buffs.map((b) => b.durationTurns));
  const boostedCaster = applyBuffs(caster, buffs);
  return (turnIndex) => {
    if (turnIndex === 1) return { caster, apBudget: apPerTurn - totalApCost };
    if (turnIndex <= durationTurns) return { caster: boostedCaster, apBudget: apPerTurn };
    return { caster, apBudget: apPerTurn };
  };
}
function nonEmptySubsets(items) {
  const subsets = [];
  for (let mask = 1; mask < 1 << items.length; mask++) {
    const subset = [];
    for (let i = 0; i < items.length; i++) {
      if (mask & 1 << i) subset.push(items[i]);
    }
    subsets.push(subset);
  }
  return subsets;
}
function planOptimalFight(damageSpells, buffSpells, caster, target, apPerTurn, targetLifePoints) {
  const baselineFight = planFight(damageSpells, caster, target, apPerTurn, targetLifePoints);
  const baseline = {
    buffs: [],
    turnsNeeded: baselineFight.turnsNeeded,
    totalDamage: baselineFight.totalDamageDealt,
    firstTurn: baselineFight.turn,
    boostedTurn: null
  };
  const strategies = [baseline];
  for (const buffs of nonEmptySubsets(buffSpells)) {
    const totalApCost = buffs.reduce((sum, b) => sum + b.apCost, 0);
    if (totalApCost > apPerTurn) continue;
    const { turns, turnsNeeded, totalDamage } = simulateFight(
      damageSpells,
      target,
      targetLifePoints,
      casterScheduleFor(caster, buffs, apPerTurn)
    );
    strategies.push({
      buffs,
      turnsNeeded,
      totalDamage,
      firstTurn: turns[0],
      boostedTurn: turns.length > 1 ? turns[1] : null
    });
  }
  const best = strategies.reduce((a, b) => {
    if (b.turnsNeeded !== a.turnsNeeded) return b.turnsNeeded < a.turnsNeeded ? b : a;
    return b.totalDamage > a.totalDamage ? b : a;
  });
  return { baseline, best, allStrategies: strategies };
}
var MAX_RACE_ROUNDS = 500;
function simulateRace(playerSpells, playerCasterForTurn, monsterTarget, monsterLifePoints, monsterSpells, monsterCaster, monsterApPerTurn, playerTarget, playerLifePoints) {
  const playerRemaining = initialRemainingCasts(playerSpells);
  const monsterRemaining = initialRemainingCasts(monsterSpells);
  let monsterHp = monsterLifePoints;
  let playerHp = playerLifePoints;
  const rounds = [];
  let round = 0;
  while (monsterHp > 0 && playerHp > 0) {
    round++;
    if (round > MAX_RACE_ROUNDS) {
      throw new Error(
        `Aucun des deux camps ne meurt au-del\xE0 de ${MAX_RACE_ROUNDS} tours \u2014 probablement parce que les sorts disponibles ont atteint leurs limites de lancers par cible des deux c\xF4t\xE9s.`
      );
    }
    const { caster, apBudget } = playerCasterForTurn(round);
    const playerTurn = planBestTurn(playerSpells, caster, monsterTarget, apBudget, playerRemaining);
    for (const e of playerTurn.entries) {
      playerRemaining.set(e.spellId, (playerRemaining.get(e.spellId) ?? Infinity) - e.casts);
    }
    monsterHp -= playerTurn.totalDamage;
    if (monsterHp <= 0) {
      rounds.push({ round, playerTurn, monsterTurn: null });
      break;
    }
    const monsterTurn = planBestTurn(monsterSpells, monsterCaster, playerTarget, monsterApPerTurn, monsterRemaining);
    for (const e of monsterTurn.entries) {
      monsterRemaining.set(e.spellId, (monsterRemaining.get(e.spellId) ?? Infinity) - e.casts);
    }
    playerHp -= monsterTurn.totalDamage;
    rounds.push({ round, playerTurn, monsterTurn });
  }
  return {
    outcome: monsterHp <= 0 ? "player_wins" : "monster_wins",
    turnsToKillMonster: monsterHp <= 0 ? round : null,
    turnsToKillPlayer: playerHp <= 0 ? round : null,
    rounds
  };
}

// src/lib/monsterStats.ts
function monsterGradeToAttackerProfile(grade) {
  return {
    characteristics: {
      strength: 0,
      intelligence: 0,
      chance: 0,
      agility: 0
    },
    elementalFixedDamage: {
      neutral: 0,
      earth: grade.bonusCharacteristics?.bonusEarthDamage ?? 0,
      fire: grade.bonusCharacteristics?.bonusFireDamage ?? 0,
      water: grade.bonusCharacteristics?.bonusWaterDamage ?? 0,
      air: grade.bonusCharacteristics?.bonusAirDamage ?? 0
    },
    combat: { power: 0, critDamageBonus: 0, critChancePercent: 0 }
  };
}
function monsterGradeToResistances(grade) {
  return {
    neutral: grade.neutralResistance,
    earth: grade.earthResistance,
    fire: grade.fireResistance,
    water: grade.waterResistance,
    air: grade.airResistance
  };
}

// src/lib/simulate.ts
function toView(turn) {
  return {
    entries: turn.entries.map((e) => ({
      name: e.name,
      casts: e.casts,
      apCostEach: e.apCostEach,
      damage: Math.round(e.casts * e.expectedDamageEach)
    })),
    totalApUsed: turn.totalApUsed,
    totalDamage: Math.round(turn.totalDamage)
  };
}
var EMPTY_TURN_VIEW = { entries: [], totalApUsed: 0, totalDamage: 0 };
function buffsLabel(buffs) {
  return buffs.length > 0 ? buffs.map((b) => b.name).join(" + ") : null;
}
async function runSimulation(input) {
  const stuff = parseStuffJson(input.stuffJson);
  const stats = computeCharacterStats(stuff);
  const apPerTurn = input.apOverride ?? stats.actionPoints;
  const pmPerTurn = input.pmOverride ?? stats.movementPoints;
  const titleHint = parseStatsFromTitle(stuff.name);
  const breed = await getBreedById(stuff.character_class);
  const [damageCoverage, buffSpells] = await Promise.all([
    resolveDamageSpellsWithCoverage(breed.breedSpellsId, stuff.character_level),
    resolveBuffSpells(breed.breedSpellsId, stuff.character_level)
  ]);
  const spellDamageOptions = damageCoverage.resolved;
  const weaponAttack = resolveWeaponAttack(stuff);
  const damageSpells = weaponAttack ? [...spellDamageOptions, weaponAttack] : spellDamageOptions;
  const { monster, grade } = await parseDofensiveLink(input.monsterLink);
  const monsterTarget = { resistancePercent: monsterGradeToResistances(grade) };
  const { baseline, best, allStrategies } = planOptimalFight(
    damageSpells,
    buffSpells,
    stats,
    monsterTarget,
    apPerTurn,
    grade.lifePoints
  );
  const monsterSpells = await resolveMonsterDamageSpells(monster, grade);
  const monsterAttacker = monsterGradeToAttackerProfile(grade);
  const playerTarget = {
    resistancePercent: stats.defense.resistancePercent,
    resistanceFixed: stats.defense.resistanceFixed,
    critResistancePercent: stats.defense.critResistancePercent
  };
  const playerLifePointsIsApprox = input.playerLifePointsOverride === void 0;
  const playerLifePoints = input.playerLifePointsOverride ?? Math.round(stats.characteristics.vitality);
  const race = simulateRace(
    damageSpells,
    casterScheduleFor(stats, best.buffs, apPerTurn),
    monsterTarget,
    grade.lifePoints,
    monsterSpells,
    monsterAttacker,
    grade.actionPoints,
    playerTarget,
    playerLifePoints
  );
  const firstRound = race.rounds[0];
  const kiteFeasibility = assessKiteFeasibility(damageSpells, pmPerTurn, grade.movementPoints);
  const kite = kiteFeasibility.possible ? (() => {
    const { ranged } = splitMonsterSpellsByRange(monsterSpells);
    const kiteRace = simulateRace(
      damageSpells,
      casterScheduleFor(stats, best.buffs, apPerTurn),
      monsterTarget,
      grade.lifePoints,
      ranged,
      monsterAttacker,
      grade.actionPoints,
      playerTarget,
      playerLifePoints
    );
    return {
      possible: true,
      reason: kiteFeasibility.reason,
      outcome: kiteRace.outcome,
      turnsToKillMonster: kiteRace.turnsToKillMonster,
      turnsToKillPlayer: kiteRace.turnsToKillPlayer
    };
  })() : { possible: false, reason: kiteFeasibility.reason, outcome: null, turnsToKillMonster: null, turnsToKillPlayer: null };
  return {
    character: {
      name: stuff.name,
      className: stuff.character_class,
      level: stuff.character_level,
      apPerTurn,
      pmPerTurn,
      intelligence: Math.round(stats.characteristics.intelligence),
      strength: Math.round(stats.characteristics.strength),
      chance: Math.round(stats.characteristics.chance),
      agility: Math.round(stats.characteristics.agility),
      vitality: Math.round(stats.characteristics.vitality),
      titleHint,
      unmodeledEffects: stats.raw
    },
    monster: {
      name: monster.name.fr,
      grade: grade.grade,
      level: grade.level,
      lifePoints: grade.lifePoints,
      actionPoints: grade.actionPoints
    },
    spellCoverage: {
      damageResolved: spellDamageOptions.length,
      damageTotal: breed.breedSpellsId.length,
      buffResolved: buffSpells.length,
      unresolvedDamageSpellNames: damageCoverage.unresolvedNames
    },
    playerAttack: {
      baselineTurnsNeeded: baseline.turnsNeeded,
      baselineTurn: toView(baseline.firstTurn),
      bestTurnsNeeded: best.turnsNeeded,
      bestBuffName: buffsLabel(best.buffs),
      strategies: allStrategies.map((s) => ({
        buffName: buffsLabel(s.buffs),
        turnsNeeded: s.turnsNeeded,
        firstTurn: toView(s.firstTurn),
        boostedTurn: s.boostedTurn ? toView(s.boostedTurn) : null
      }))
    },
    monsterAttack: {
      apBudget: grade.actionPoints,
      turn: firstRound.monsterTurn ? toView(firstRound.monsterTurn) : EMPTY_TURN_VIEW,
      spellCoverage: { resolved: monsterSpells.length, total: monster.spells.length }
    },
    race: {
      outcome: race.outcome,
      turnsToKillMonster: race.turnsToKillMonster,
      turnsToKillPlayer: race.turnsToKillPlayer,
      playerLifePoints,
      playerLifePointsIsApprox
    },
    kite
  };
}
export {
  runSimulation
};
