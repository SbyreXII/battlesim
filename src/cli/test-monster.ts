import { parseDofensiveLink } from "../lib/dofensiveParser.js";

const link =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

const result = await parseDofensiveLink(link);
console.log(JSON.stringify(result, null, 2));
