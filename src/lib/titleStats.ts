/**
 * Beaucoup de joueurs mettent volontairement leurs PA/PM dans le TITRE du
 * stuff sur dofusbook.net (ex: "Feu LvL 200 - 12 PA / 5 PM - Iop Cape High")
 * pour que ce soit visible d'un coup d'œil. C'est un champ texte libre tapé
 * à la main — ni calculé ni vérifié par dofusbook, potentiellement périmé
 * si le stuff a changé depuis — donc à traiter comme un indice, pas comme
 * une source fiable (contrairement à un affichage calculé par le site
 * lui-même, ex: la barre "Stuff actif" sur la page "Mes stuffs").
 */
export interface TitleStatsHint {
  pa: number | null;
  pm: number | null;
}

const TITLE_PATTERN = /(\d+)\s*PA\s*\/\s*(\d+)\s*PM/i;

export function parseStatsFromTitle(name: string): TitleStatsHint {
  const match = name.match(TITLE_PATTERN);
  if (!match) return { pa: null, pm: null };
  return { pa: Number(match[1]), pm: Number(match[2]) };
}
