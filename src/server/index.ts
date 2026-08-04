import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "../lib/simulate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

const app = express();
app.use(express.json({ limit: "2mb" }));
// Permet à l'extension navigateur (origine chrome-extension://...) d'appeler
// l'API locale. Sans danger : serveur local, pas de données sensibles ni
// d'authentification en jeu.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  // Private Network Access (Chrome) : une page HTTPS (ex: dofusbook.net)
  // qui appelle un serveur local doit passer une vérification en plus du
  // CORS classique, sans quoi la requête reste bloquée en attente sans
  // jamais échouer proprement. Sans danger ici : serveur local, pas de
  // données sensibles.
  res.header("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.static(PUBLIC_DIR));
// Sert le stuff d'exemple utilisé par le bouton "Charger un exemple" du formulaire.
app.use("/fixtures", express.static(path.join(__dirname, "..", "..", "fixtures")));

app.post("/api/simulate", async (req, res) => {
  const { stuffJson, monsterLink, apOverride, playerLifePointsOverride } = req.body ?? {};
  if (typeof stuffJson !== "string" || !stuffJson.trim()) {
    res.status(400).json({ error: "Le JSON du stuff est manquant." });
    return;
  }
  if (typeof monsterLink !== "string" || !monsterLink.trim()) {
    res.status(400).json({ error: "Le lien dofensive.com est manquant." });
    return;
  }

  try {
    const result = await runSimulation({
      stuffJson,
      monsterLink,
      apOverride: typeof apOverride === "number" && apOverride > 0 ? apOverride : undefined,
      playerLifePointsOverride:
        typeof playerLifePointsOverride === "number" && playerLifePointsOverride > 0
          ? playerLifePointsOverride
          : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message ?? "Erreur inconnue." });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`BattleSim en écoute sur http://localhost:${PORT}`);
});
