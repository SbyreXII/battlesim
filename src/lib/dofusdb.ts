const DOFUSDB_BASE = "https://api.dofusdb.fr";

async function dofusDbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DOFUSDB_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`DofusDB request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * Cache mémoire par id, partagé pour la durée de vie du process serveur. Les
 * données DofusDB (sorts, monstres, classes) ne changent pas pendant qu'on
 * tourne, et une seule simulation redemande souvent le même sort/niveau
 * plusieurs fois (sorts partagés entre grades de monstre, sorts de buff
 * revus pour chaque combinaison testée, etc.) — sans compter les essais
 * répétés de l'utilisateur sur le même stuff/monstre. Simplification
 * assumée : pas d'expiration ni de limite de taille (le référentiel
 * DofusDB est petit et statique à l'échelle d'un process).
 */
function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyOf: (...args: TArgs) => string,
): (...args: TArgs) => Promise<TResult> {
  const cache = new Map<string, Promise<TResult>>();
  return (...args: TArgs) => {
    const key = keyOf(...args);
    const cached = cache.get(key);
    if (cached) return cached;
    const promise = fn(...args).catch((err) => {
      cache.delete(key); // ne pas garder en cache un échec (ex: DofusDB temporairement indisponible)
      throw err;
    });
    cache.set(key, promise);
    return promise;
  };
}

export interface DofusDbMonsterGrade {
  grade: number;
  level: number;
  lifePoints: number;
  actionPoints: number;
  movementPoints: number;
  strength: number;
  intelligence: number;
  chance: number;
  agility: number;
  wisdom: number;
  earthResistance: number;
  fireResistance: number;
  waterResistance: number;
  airResistance: number;
  neutralResistance: number;
  startingSpellId: number;
  bonusCharacteristics?: {
    bonusEarthDamage: number;
    bonusFireDamage: number;
    bonusWaterDamage: number;
    bonusAirDamage: number;
  };
}

export interface DofusDbMonster {
  id: number;
  race: number;
  grades: DofusDbMonsterGrade[];
  name: Record<string, string>;
  spells: number[];
  /**
   * Un item par sort de `spells` (même index) : chaîne "spellGrade,level;..."
   * — une paire par grade de MONSTRE (1 à 6), indiquant quel grade du SORT
   * utiliser à ce grade de monstre. Nécessaire car `getBestSpellLevel` (conçu
   * pour les personnages, qui choisit le plus haut grade éligible par
   * niveau) donnerait un résultat faux pour un monstre bas grade dont un
   * sort a des dégâts différents selon le grade.
   */
  spellGrades: string[];
}

export const getMonsterById = withCache(async (id: number): Promise<DofusDbMonster> => {
  const result = await dofusDbGet<{ total: number; data: DofusDbMonster[] }>(
    `/monsters?id=${id}`,
  );
  const monster = result.data[0];
  if (!monster) throw new Error(`Monstre DofusDB introuvable pour l'id ${id}`);
  return monster;
}, String);

export interface DofusDbSpell {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  spellLevels: number[];
}

export const getSpellById = withCache(async (id: number): Promise<DofusDbSpell> => {
  const result = await dofusDbGet<{ total: number; data: DofusDbSpell[] }>(
    `/spells?id=${id}`,
  );
  const spell = result.data[0];
  if (!spell) throw new Error(`Sort DofusDB introuvable pour l'id ${id}`);
  return spell;
}, String);

export interface DofusDbSpellEffect {
  effectId: number;
  effectElement: number; // 0=Neutre 1=Terre 2=Feu 3=Eau 4=Air, 5=pseudo-élément "critique", -1=non élémentaire
  diceNum: number; // borne basse du jet de dégâts (ou valeur fixe si diceSide=0)
  diceSide: number; // borne haute du jet de dégâts
  duration: number; // en tours ; 0 = instantané
  targetMask: string;
}

export interface DofusDbSpellLevel {
  id: number;
  spellId: number;
  grade: number;
  apCost: number;
  minRange: number;
  range: number;
  criticalHitProbability: number; // "1 chance sur N"
  minPlayerLevel: number;
  maxCastPerTurn: number; // 0 = illimité
  maxCastPerTarget: number; // 0 = illimité ; limite cumulée sur toute la durée du combat contre une même cible
  effects: DofusDbSpellEffect[];
  criticalEffect: DofusDbSpellEffect[];
}

export const getSpellLevelById = withCache(async (id: number): Promise<DofusDbSpellLevel> => {
  const result = await dofusDbGet<{ total: number; data: DofusDbSpellLevel[] }>(
    `/spell-levels?id=${id}`,
  );
  const level = result.data[0];
  if (!level) throw new Error(`SpellLevel DofusDB introuvable pour l'id ${id}`);
  return level;
}, String);

export interface DofusDbBreed {
  id: number;
  breedSpellsId: number[];
}

export const getBreedById = withCache(async (id: number): Promise<DofusDbBreed> => {
  const result = await dofusDbGet<{ total: number; data: DofusDbBreed[] }>(
    `/breeds?id=${id}`,
  );
  const breed = result.data[0];
  if (!breed) throw new Error(`Classe DofusDB introuvable pour l'id ${id}`);
  return breed;
}, String);

/**
 * Renvoie le meilleur spell-level (le plus haut grade débloqué) pour un sort
 * donné, compte tenu du niveau du personnage.
 */
export async function getBestSpellLevel(
  spellId: number,
  characterLevel: number,
): Promise<DofusDbSpellLevel> {
  const spell = await getSpellById(spellId);
  const levels = await Promise.all(spell.spellLevels.map(getSpellLevelById));
  const eligible = levels
    .filter((l) => l.minPlayerLevel <= characterLevel)
    .sort((a, b) => b.grade - a.grade);
  const best = eligible[0];
  if (!best) {
    throw new Error(
      `Aucun niveau du sort ${spellId} n'est accessible au niveau ${characterLevel}`,
    );
  }
  return best;
}

/**
 * Renvoie le spell-level d'un grade précis (utilisé pour les sorts de
 * monstre, où le grade à utiliser vient de `DofusDbMonster.spellGrades`, pas
 * du niveau du monstre). Repli sur le grade le plus bas si le grade demandé
 * n'existe pas.
 */
export async function getSpellLevelForGrade(
  spellId: number,
  desiredGrade: number,
): Promise<DofusDbSpellLevel> {
  const spell = await getSpellById(spellId);
  const levels = await Promise.all(spell.spellLevels.map(getSpellLevelById));
  const match = levels.find((l) => l.grade === desiredGrade);
  if (match) return match;
  const sorted = levels.sort((a, b) => a.grade - b.grade);
  if (!sorted[0]) {
    throw new Error(`Aucun niveau trouvé pour le sort ${spellId}`);
  }
  return sorted[0];
}
