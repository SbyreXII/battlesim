import type { DofusbookStuff } from "./dofusbookParser.js";

/**
 * Décodage des codes d'effet à 2-3 lettres utilisés par dofusbook.net.
 * ATTENTION : ce ne sont PAS les ids d'effet officiels d'Ankama (vérifié :
 * les ids numériques dofusbook ne correspondent pas à la collection
 * `/effects` de DofusDB, qui a son propre référentiel). Ce mapping a été
 * déduit par recoupement avec des effets d'objets connus (ex: "Dofus
 * Pourpre" = +80 Puissance → code "pu" confirmé). Liste volontairement
 * limitée aux stats utiles au moteur de dégâts ; le reste atterrit dans
 * `raw` pour rester visible plutôt que d'être silencieusement perdu.
 */
const CHARACTERISTIC_CODES = {
  vi: "vitality",
  fo: "strength",
  in: "intelligence",
  ch: "chance",
  ag: "agility",
  sa: "wisdom",
} as const;

const ELEMENTAL_FIXED_DAMAGE_CODES = {
  dnf: "neutral",
  dtf: "earth",
  dff: "fire",
  def: "water",
  daf: "air",
} as const;

const COMBAT_CODES = {
  cc: "critChancePercent",
  dc: "critDamageBonus",
  pu: "power",
  pa: "apBonus",
  pm: "mpBonus",
} as const;

/** Résistances % par élément : code = r + lettre d'élément + "p". */
const RESISTANCE_PERCENT_CODES = {
  rnp: "neutral",
  rtp: "earth",
  rfp: "fire",
  rep: "water",
  rap: "air",
} as const;

/** Résistances fixes par élément : code = r + lettre d'élément (sans "p"). */
const RESISTANCE_FIXED_CODES = {
  rn: "neutral",
  rt: "earth",
  rf: "fire",
  re: "water",
  ra: "air",
} as const;

export interface CharacterStats {
  characteristics: Record<(typeof CHARACTERISTIC_CODES)[keyof typeof CHARACTERISTIC_CODES], number>;
  elementalFixedDamage: Record<(typeof ELEMENTAL_FIXED_DAMAGE_CODES)[keyof typeof ELEMENTAL_FIXED_DAMAGE_CODES], number>;
  combat: Record<(typeof COMBAT_CODES)[keyof typeof COMBAT_CODES], number>;
  defense: {
    resistancePercent: Record<(typeof RESISTANCE_PERCENT_CODES)[keyof typeof RESISTANCE_PERCENT_CODES], number>;
    resistanceFixed: Record<(typeof RESISTANCE_FIXED_CODES)[keyof typeof RESISTANCE_FIXED_CODES], number>;
    /** "rc" : Résistance Critique — réduit la chance d'être touché par un critique adverse. */
    critResistancePercent: number;
  };
  /** PA/PM totaux (base 6 PA / 3 PM + bonus d'objets ; monture non comptée). */
  actionPoints: number;
  movementPoints: number;
  /** Codes d'effet rencontrés mais pas encore modélisés (valeur moyenne sommée). */
  raw: Record<string, number>;
}

/** Base standard Ankama pour tout personnage (hors bonus). */
const BASE_ACTION_POINTS = 6;
const BASE_MOVEMENT_POINTS = 3;

function emptyStats(): CharacterStats {
  return {
    characteristics: { vitality: 0, strength: 0, intelligence: 0, chance: 0, agility: 0, wisdom: 0 },
    elementalFixedDamage: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
    combat: { critChancePercent: 0, critDamageBonus: 0, power: 0, apBonus: 0, mpBonus: 0 },
    defense: {
      resistancePercent: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
      resistanceFixed: { neutral: 0, earth: 0, fire: 0, water: 0, air: 0 },
      critResistancePercent: 0,
    },
    actionPoints: BASE_ACTION_POINTS,
    movementPoints: BASE_MOVEMENT_POINTS,
    raw: {},
  };
}

function addEffect(stats: CharacterStats, code: string, amount: number) {
  if (code in CHARACTERISTIC_CODES) {
    const key = CHARACTERISTIC_CODES[code as keyof typeof CHARACTERISTIC_CODES];
    stats.characteristics[key] += amount;
  } else if (code in ELEMENTAL_FIXED_DAMAGE_CODES) {
    const key = ELEMENTAL_FIXED_DAMAGE_CODES[code as keyof typeof ELEMENTAL_FIXED_DAMAGE_CODES];
    stats.elementalFixedDamage[key] += amount;
  } else if (code in COMBAT_CODES) {
    const key = COMBAT_CODES[code as keyof typeof COMBAT_CODES];
    stats.combat[key] += amount;
  } else if (code in RESISTANCE_PERCENT_CODES) {
    const key = RESISTANCE_PERCENT_CODES[code as keyof typeof RESISTANCE_PERCENT_CODES];
    stats.defense.resistancePercent[key] += amount;
  } else if (code in RESISTANCE_FIXED_CODES) {
    const key = RESISTANCE_FIXED_CODES[code as keyof typeof RESISTANCE_FIXED_CODES];
    stats.defense.resistanceFixed[key] += amount;
  } else if (code === "rc") {
    stats.defense.critResistancePercent += amount;
  } else {
    stats.raw[code] = (stats.raw[code] ?? 0) + amount;
  }
}

interface ItemEffect {
  name: string;
  type: string;
  min: number;
  max: number;
}

interface ClothEffect {
  name: string;
  type: string;
  value: number;
}

/**
 * Agrège les caractéristiques du personnage à partir des objets équipés, des
 * bonus de panoplie, et des caractéristiques de base choisies dans l'éditeur
 * dofusbook (`stuffCarac`).
 *
 * Hypothèse sur `stuffCarac` (non confirmée officiellement, déduite de la
 * cohérence des valeurs — ex: un stuff "Feu" a `base_in` élevé et
 * `base_fo/ch/ag` à 0) : `base_XX` est déjà la valeur finale de la
 * caractéristique choisie via les curseurs de l'éditeur (points de
 * level-up + parchemins confondus), directement additive. `scroll_XX` (0-100)
 * ne serait qu'un indicateur du taux de parchemin utilisé pour l'affichage,
 * pas une valeur à additionner en plus. Si les chiffres obtenus s'avèrent
 * trop bas par rapport au jeu réel, c'est le premier endroit à vérifier.
 *
 * Simplification restante (TODO) : pas de bonus %dégâts (spécifique au sort
 * / élémentaire / finaux), pas d'effets conditionnels/scriptés (états,
 * stacks, passifs de panoplie déclenchés sur événement).
 */
export function computeCharacterStats(stuff: DofusbookStuff): CharacterStats {
  const stats = emptyStats();

  for (const item of stuff.items as { effects: ItemEffect[] }[]) {
    for (const effect of item.effects ?? []) {
      if (effect.type !== "E") continue; // on ignore armes (D), sorts additionnels (C), passifs (O), usage (U)
      addEffect(stats, effect.name, (effect.min + effect.max) / 2);
    }
  }

  for (const cloth of (stuff.cloths as { effects: ClothEffect[] }[] | undefined) ?? []) {
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
