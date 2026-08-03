import { readFile } from "node:fs/promises";
import { parseDofensiveLink } from "../lib/dofensiveParser.js";
import { fetchDofusbookStuff, parseStuffJson } from "../lib/dofusbookParser.js";

async function resolveStuff(source: string) {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return fetchDofusbookStuff(source);
  }
  // Sinon on suppose que c'est un chemin vers un fichier JSON collé manuellement
  // (contenu de https://www.dofusbook.net/api/stuffs/dofus/public/{id}).
  const raw = await readFile(source, "utf-8");
  return parseStuffJson(raw);
}

async function main() {
  const [stuffSource, monsterLink] = process.argv.slice(2);
  if (!stuffSource || !monsterLink) {
    console.error(
      "Usage: npm run parse -- <lien-dofusbook-ou-fichier.json> <lien-dofensive>",
    );
    process.exit(1);
  }

  const [stuff, monster] = await Promise.all([
    resolveStuff(stuffSource),
    parseDofensiveLink(monsterLink),
  ]);

  console.log(JSON.stringify({ stuff, monster }, null, 2));
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
