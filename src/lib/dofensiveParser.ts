import lzString from "lz-string";
const { decompressFromEncodedURIComponent } = lzString;
import { getMonsterById, type DofusDbMonster, type DofusDbMonsterGrade } from "./dofusdb.js";

interface DofensiveState {
  SelectedMonster: number;
  Monsters: Record<
    string,
    {
      Grade: number;
      Spells: unknown[];
    }
  >;
}

export interface ParsedMonster {
  monster: DofusDbMonster;
  grade: DofusDbMonsterGrade;
  state: DofensiveState;
}

function extractMonsterId(url: URL): number {
  const match = url.pathname.match(/\/monster\/(\d+)/);
  if (!match) {
    throw new Error(`Impossible d'extraire l'id du monstre depuis ${url.pathname}`);
  }
  return Number(match[1]);
}

function decodeState(url: URL): DofensiveState | null {
  const q = url.searchParams.get("q");
  if (!q) return null;
  const json = decompressFromEncodedURIComponent(q);
  if (!json) throw new Error("Impossible de décompresser le paramètre q= de dofensive.com");
  return JSON.parse(json) as DofensiveState;
}

export async function parseDofensiveLink(link: string): Promise<ParsedMonster> {
  const url = new URL(link);
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
    state: state ?? { SelectedMonster: monsterId, Monsters: {} },
  };
}
