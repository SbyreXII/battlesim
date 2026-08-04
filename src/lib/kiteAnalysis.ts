import type { DamageSpellOption } from "./spellCatalog.js";

export interface KiteFeasibility {
  possible: boolean;
  reason: string;
}

/**
 * Estimation TRÈS simplifiée de la faisabilité du kite, faute de tout modèle
 * positionnel (pas de grille, pas de portée de ligne de vue, pas de calcul
 * de la vraie chance d'échapper au Tacle via le ratio Tacle/Fuite — cette
 * formule officielle n'est pas connue ici).
 *
 * Règle utilisée : le joueur peut espérer kiter s'il a au moins un sort à
 * portée > 1 (pas besoin d'être collé à la cible pour infliger des dégâts)
 * ET au moins autant de PM que le monstre (peut maintenir la distance aussi
 * bien que le monstre peut la combler). Si ces deux conditions sont réunies,
 * on suppose que le joueur reste hors de portée des sorts de mêlée (portée
 * ≤ 1) du monstre pour le reste du combat — en pratique, la vraie chance de
 * succès dépend du Tacle du monstre contre la Fuite du joueur (non modélisé
 * ici), donc ce résultat est optimiste si le monstre a un gros Tacle.
 */
export function assessKiteFeasibility(
  playerSpells: DamageSpellOption[],
  playerMovementPoints: number,
  monsterMovementPoints: number,
): KiteFeasibility {
  const hasRangedOption = playerSpells.some((s) => s.range > 1);
  if (!hasRangedOption) {
    return { possible: false, reason: "Aucun sort à portée > 1 disponible — obligé de rester au contact." };
  }
  if (playerMovementPoints < monsterMovementPoints) {
    return {
      possible: false,
      reason: `PM insuffisants pour maintenir la distance (${playerMovementPoints} contre ${monsterMovementPoints} au monstre).`,
    };
  }
  return { possible: true, reason: "Sort(s) à distance disponibles et PM au moins égaux au monstre." };
}

/** Sépare les sorts d'un monstre entre mêlée (portée ≤ 1) et distance (portée > 1). */
export function splitMonsterSpellsByRange(monsterSpells: DamageSpellOption[]): {
  melee: DamageSpellOption[];
  ranged: DamageSpellOption[];
} {
  return {
    melee: monsterSpells.filter((s) => s.range <= 1),
    ranged: monsterSpells.filter((s) => s.range > 1),
  };
}
