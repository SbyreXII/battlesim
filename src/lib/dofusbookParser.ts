export interface DofusbookStuff {
  id: number;
  name: string;
  character_class: number;
  character_level: number;
  stuffCarac: Record<string, number>;
  stuffItem: Record<string, number | null>;
  items: unknown[];
  [key: string]: unknown;
}

const API_URL = (id: number) => `https://www.dofusbook.net/api/stuffs/dofus/public/${id}`;

export function extractStuffId(link: string): number {
  // Formats connus qui contiennent l'id numérique du stuff :
  //   .../equipement/22900173-slug-du-stuff
  //   .../api/stuffs/dofus/public/22900173
  const match = link.match(/(\d{3,})/);
  if (!match) {
    throw new Error(
      `Impossible d'extraire un id numérique de stuff depuis "${link}". ` +
        `Les liens courts d-bk.net/fr/d/{code} ne sont pas supportés pour l'instant.`,
    );
  }
  return Number(match[1]);
}

interface ApiEnvelope {
  stuff: DofusbookStuff;
  items?: unknown[];
  cloths?: unknown[];
}

function normalize(raw: unknown): DofusbookStuff {
  const body = raw as ApiEnvelope | DofusbookStuff;
  // `items` et `cloths` sont des frères de `stuff` au niveau racine de la
  // réponse de l'API (pas nichés dedans) : on les rattache au retour pour
  // que le reste du code (agrégation des stats) n'ait qu'un seul objet à lire.
  const stuff =
    "stuff" in (body as Record<string, unknown>)
      ? {
          ...(body as ApiEnvelope).stuff,
          items: (body as ApiEnvelope).items ?? (body as ApiEnvelope).stuff.items,
          cloths: (body as ApiEnvelope).cloths ?? (body as ApiEnvelope).stuff.cloths,
        }
      : (body as DofusbookStuff);
  if (!stuff || typeof stuff.id !== "number" || !stuff.stuffItem) {
    throw new Error("JSON de stuff invalide : champs attendus (id, stuffItem) absents.");
  }
  return stuff;
}

/** Parse un stuff à partir du JSON collé manuellement par l'utilisateur (contenu de l'appel API dofusbook.net). */
export function parseStuffJson(raw: string): DofusbookStuff {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Le contenu fourni n'est pas du JSON valide.");
  }
  return normalize(parsed);
}

/**
 * Tentative de récupération directe (best-effort). dofusbook.net est protégé
 * par Cloudflare et bloque généralement les requêtes serveur-à-serveur
 * (testé : même un Chromium headless piloté par Playwright se fait bloquer).
 * On tente quand même un fetch simple ici — au cas où ça passe pour cette
 * instance/ce endpoint — mais le point d'entrée fiable reste
 * `parseStuffJson`, alimenté par un JSON collé manuellement par l'utilisateur
 * (ouvrir le lien de l'API ci-dessus dans son propre navigateur et copier le
 * contenu affiché).
 */
export async function fetchDofusbookStuff(link: string): Promise<DofusbookStuff> {
  const stuffId = extractStuffId(link);
  const url = API_URL(stuffId);

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new Error(`Impossible de contacter dofusbook.net : ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new Error(
      `dofusbook.net a bloqué la requête automatique (${res.status}). ` +
        `Ouvre ${url} dans ton propre navigateur, copie le JSON affiché, ` +
        `et utilise parseStuffJson(...) à la place.`,
    );
  }
  return normalize(await res.json());
}
