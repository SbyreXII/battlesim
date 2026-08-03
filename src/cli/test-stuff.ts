import { fetchDofusbookStuff } from "../lib/dofusbookParser.js";

const stuff = await fetchDofusbookStuff(
  "https://www.dofusbook.net/api/stuffs/dofus/public/22900173",
);
console.log(
  JSON.stringify(
    { id: stuff.id, name: stuff.name, character_class: stuff.character_class },
    null,
    2,
  ),
);
