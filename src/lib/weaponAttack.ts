import type { DofusbookStuff } from "./dofusbookParser.js";
import type { DamageSpellOption } from "./spellCatalog.js";

interface WeaponInfo {
  pa_cost: number;
  hits_count: number;
  cc_hits: number; // "1 chance sur cc_hits" d'être critique, même convention que les sorts
}

interface ItemEffect {
  name: string;
  type: string;
  min: number;
  max: number;
}

interface DofusbookItem {
  effects: ItemEffect[];
  weapon: WeaponInfo | null;
}

const WEAPON_ATTACK_SPELL_ID = -1; // sentinel : aucun vrai sort DofusDB n'a un id négatif

/**
 * Résout l'attaque à l'arme équipée comme une option de dégâts utilisable
 * par l'optimiseur, au même titre qu'un sort. `null` si aucune arme (ou pas
 * de bonus "df" trouvé).
 *
 * Simplifications assumées (TODO, non vérifiées) :
 * - Élément Neutre par défaut : dofusbook ne donne pas l'élément de l'arme
 *   dans les données qu'on lit, et la plupart des armes de base infligent
 *   des dégâts Neutre en Dofus. Une arme enchantée dans un autre élément
 *   serait donc sous-évaluée ici (pas de bonus de caractéristique appliqué).
 * - `hits_count` (nombre de coups par utilisation) multiplie directement les
 *   dés de dégâts, sans distinction entre les coups.
 * - Pas de jet critique séparé pour l'arme (comme pour les sorts sans
 *   `criticalEffect` propre) : le critique réutilise le même jet, le bonus
 *   "Dommages Critiques" du personnage s'ajoutant par-dessus comme d'habitude.
 * - `cc_bonus`/`cc_rate` de l'arme ne sont pas utilisés (évite un double
 *   comptage avec le bonus "cc" générique déjà sommé sur les objets) ;
 *   seul `cc_hits` sert de probabilité de critique de base.
 */
export function resolveWeaponAttack(stuff: DofusbookStuff): DamageSpellOption | null {
  const items = (stuff.items as DofusbookItem[] | undefined) ?? [];
  const weaponItem = items.find((it) => it.weapon != null);
  if (!weaponItem?.weapon) return null;

  const damageEffect = weaponItem.effects?.find((e) => e.type === "D" && e.name === "df");
  if (!damageEffect) return null;

  const { pa_cost, hits_count, cc_hits } = weaponItem.weapon;
  const hits = hits_count > 0 ? hits_count : 1;

  return {
    spellId: WEAPON_ATTACK_SPELL_ID,
    name: "Attaque à l'arme",
    grade: 1,
    apCost: pa_cost,
    maxCastPerTurn: 0, // limité par le budget de PA uniquement, comme en jeu
    maxCastPerTarget: 0,
    range: 1,
    element: "neutral",
    normalDamage: { min: damageEffect.min * hits, max: damageEffect.max * hits },
    criticalDamage: { min: damageEffect.min * hits, max: damageEffect.max * hits },
    criticalHitProbability: cc_hits > 0 ? cc_hits : 1_000_000,
  };
}
